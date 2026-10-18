import axios from 'axios';

/**
 * GDACS (Global Disaster Alert and Coordination System) Service
 * Free, keyless API — https://www.gdacs.org/
 * Filters events to India for disaster risk signals.
 */

export interface GDACSEvent {
  eventId: string;
  eventType: string; // EQ, TC, FL, DR, VO, WF
  title: string;
  severity: 'Green' | 'Orange' | 'Red';
  country: string;
  fromDate: string;
  toDate: string;
  lat?: number;
  lon?: number;
}

export interface GDACSSignal {
  count: number;
  maxSeverity: 'None' | 'Green' | 'Orange' | 'Red';
  events: GDACSEvent[];
  riskScore: number; // 0-100 derived from events
  summary: string;
}

const SEVERITY_WEIGHT: Record<string, number> = { Green: 10, Orange: 40, Red: 80 };

class GDACSService {
  private baseUrl = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH';
  private cache: { data: GDACSSignal; ts: number } | null = null;
  private cacheMs = 6 * 60 * 60 * 1000; // 6 h

  async getIndiaDisasterSignal(): Promise<GDACSSignal> {
    if (this.cache && Date.now() - this.cache.ts < this.cacheMs) {
      return this.cache.data;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          alertlevel: 'Green;Orange;Red',
          country: 'IND',
          fromDate: this.daysAgo(30),
          toDate: new Date().toISOString().split('T')[0],
          pagesize: 50,
        },
        timeout: 8000,
        headers: { Accept: 'application/json' },
      });

      const typeLabels: Record<string, string> = {
        FL: 'Rainfall / Flood Watch',
        TC: 'Cyclone / Storm Watch',
        DR: 'Drought / Moisture Stress',
        EQ: 'Minor Seismic Reading (Low Impact)',
        WF: 'Field / Forest Fire',
        VO: 'Volcanic Activity',
      };

      const features: any[] = response.data?.features ?? [];
      const events: GDACSEvent[] = features.map(f => {
        const rawType = f.properties?.eventtype ?? 'Unknown';
        const rawTitle = f.properties?.htmldescription ?? f.properties?.name ?? 'Regional Weather Observation';
        const cleanTitle = rawTitle.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
        return {
          eventId: String(f.properties?.eventid ?? ''),
          eventType: typeLabels[rawType] || rawType,
          title: cleanTitle || 'Regional Weather Observation',
          severity: (f.properties?.alertlevel ?? 'Green') as GDACSEvent['severity'],
          country: f.properties?.country ?? 'India',
          fromDate: f.properties?.fromdate ?? '',
          toDate: f.properties?.todate ?? '',
          lat: f.geometry?.coordinates?.[1],
          lon: f.geometry?.coordinates?.[0],
        };
      });

      const signal = this.buildSignal(events);
      this.cache = { data: signal, ts: Date.now() };
      console.log(`🌍 GDACS: ${events.length} events in India, risk score ${signal.riskScore}`);
      return signal;
    } catch (err: any) {
      console.error('GDACS API error:', err.message);
      return this.getEmptySignal();
    }
  }

  private buildSignal(events: GDACSEvent[]): GDACSSignal {
    if (events.length === 0) return this.getEmptySignal();

    const severities = events.map(e => e.severity);
    const maxSeverity = severities.includes('Red')
      ? 'Red'
      : severities.includes('Orange')
      ? 'Orange'
      : 'Green';

    // Weighted average risk score (0-100)
    const riskScore = Math.min(
      100,
      Math.round(events.reduce((sum, e) => sum + (SEVERITY_WEIGHT[e.severity] ?? 0), 0) / events.length),
    );

    const summary =
      events.length > 0
        ? `${events.length} active disaster event(s) in India. Max severity: ${maxSeverity}. Types: ${[...new Set(events.map(e => e.eventType))].join(', ')}.`
        : 'No active disaster events in India.';

    return { count: events.length, maxSeverity, events: events.slice(0, 10), riskScore, summary };
  }

  private getEmptySignal(): GDACSSignal {
    return { count: 0, maxSeverity: 'None', events: [], riskScore: 0, summary: 'No active disaster events in India.' };
  }

  private daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }
}

export const gdacsService = new GDACSService();
