import { RekognitionClient, DetectLabelsCommand, DetectTextCommand } from '@aws-sdk/client-rekognition';

const client = new RekognitionClient({ region: process.env.AWS_REGION });

export class RekognitionService {
  async analyzeQuality(imageBytes: Buffer) {
    const command = new DetectLabelsCommand({
      Image: { Bytes: imageBytes },
      MaxLabels: 20,
      MinConfidence: 70,
    });

    const response = await client.send(command);
    
    // Analyze labels for quality indicators
    const qualityIndicators = {
      freshness: 0,
      damage: 0,
      color: 'unknown',
      overallScore: 0,
    };

    const labels = response.Labels || [];
    
    // Simple quality scoring based on detected labels
    const positiveLabels = ['fresh', 'green', 'ripe', 'healthy'];
    const negativeLabels = ['damaged', 'rotten', 'wilted', 'brown'];

    labels.forEach(label => {
      const name = label.Name?.toLowerCase() || '';
      const confidence = label.Confidence || 0;

      if (positiveLabels.some(pl => name.includes(pl))) {
        qualityIndicators.freshness += confidence;
      }
      if (negativeLabels.some(nl => name.includes(nl))) {
        qualityIndicators.damage += confidence;
      }
    });

    qualityIndicators.overallScore = Math.max(
      0,
      Math.min(100, qualityIndicators.freshness - qualityIndicators.damage)
    );

    return {
      labels: labels.map(l => ({ name: l.Name, confidence: l.Confidence })),
      qualityIndicators,
    };
  }

  async detectText(imageBytes: Buffer) {
    const command = new DetectTextCommand({
      Image: { Bytes: imageBytes },
    });

    const response = await client.send(command);
    return response.TextDetections?.map(t => ({
      text: t.DetectedText,
      confidence: t.Confidence,
      type: t.Type,
    })) || [];
  }
}

export const rekognitionService = new RekognitionService();
