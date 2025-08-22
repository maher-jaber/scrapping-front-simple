import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  constructor(private http: HttpClient) { }

  getRegions(): Observable<any[]> {
    return this.http.get<any[]>('assets/reg_names.json');
  }

  getDepartements(): Observable<any[]> {
    return this.http.get<any[]>('assets/dep_names.json');
  }

  getVilles(): Observable<any[]> {
    return this.http.get<any[]>('assets/villes.json');
  }
}