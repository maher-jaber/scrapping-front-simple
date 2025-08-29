import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Departement {
  code_departement: string;
  nom_departement: string;
  code_region: string;
  nom_region: string;
}

@Injectable({ providedIn: 'root' })
export class GeoService {

  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getRegions(): Observable<string[]> {
    // Retourne directement une liste de strings
    return this.http.get<string[]>(`${this.api}/geo/regions`)
      .pipe(map(regions => regions.sort()));
  }

  getDepartements(): Observable<Departement[]> {
    return this.http.get<Departement[]>(`${this.api}/geo/departements`)
      .pipe(map(deps => deps.sort((a, b) => a.nom_departement.localeCompare(b.nom_departement))));
  }

  getCommunes(): Observable<string[]> {
    // Retourne directement une liste de strings
    return this.http.get<string[]>(`${this.api}/geo/communes`)
      .pipe(map(comms => comms.sort()));
  }

  // Optionnel : tout charger en parallèle
  getAll(): Observable<{regions: string[], departements: Departement[], communes: string[]}> {
    return forkJoin({
      regions: this.getRegions(),
      departements: this.getDepartements(),
      communes: this.getCommunes()
    });
  }
}
