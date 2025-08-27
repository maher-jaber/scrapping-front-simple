import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';


export interface ScrapeRequest { query: string; location: string; max_results: number; }
export interface ScrapeResult {
  id?: number;
  name: string; address: string; phone: string; website: string;
  plus_code?: string; horaires?: string; note?: string; scraped_at?: string; already_scrapped?: boolean;
}
export interface HistoryRow {
  history_id: number; scraped_at: string; query: string; location: string; source: string;
  name: string; address: string; phone: string; website: string; plus_code: string; note: string; horaires: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  scrape(source: 'googlemaps'|'pagesjaunes', payload: ScrapeRequest) {
    const url = source === 'googlemaps' ? '/scrape/googlemaps' : '/scrape/pagesjaunes';
    return this.http.post<{ status: string; results: ScrapeResult[] }>(`${this.api}${url}`, payload);
  }
  getStatus(source: 'googlemaps'|'pagesjaunes'): Observable<any> {
    const url = source === 'googlemaps' ? '/scrape/googlemaps/status' : '/scrape/pagesjaunes/status';
    return this.http.get<any>(`${this.api}${url}`, {
      headers: this.getAuthHeaders()
    });
  }
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
  
  historique(params: {
    page?: number; per_page?: number; query?: string; location?: string; source?: string; date_from?: string; date_to?: string;
  }) {
    let p = new HttpParams();
    Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v)); });
    return this.http.get<{ page: number; per_page: number; total: number; historique: HistoryRow[] }>(`${this.api}/historique`, { params: p });
  }

  logout() {
    return this.http.post(`${this.api}/logout`, {});
  }
  stopScraping(source: string): Observable<any> {
    const sourceFormated = source === 'googlemaps' ? 'gmaps' : 'pagesjaunes';
    return this.http.post(`${this.api}/scrape/stop?source=${sourceFormated}`, {});
}

getStatusSC(source: string): Observable<any> {
  
    return this.http.get(`${this.api}/scrape/${source}/status`);
}
}
