import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable, debounceTime, distinctUntilChanged, map, startWith } from 'rxjs';

// Ton service
import { ApiService, HistoryRow } from '../core/api.service';

// Angular Material - Form & Inputs
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Angular Material - Table
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

@Component({
  selector: 'app-historique',
  imports: [ CommonModule,
    FormsModule,
    ReactiveFormsModule,

    // Material Form Fields & Inputs
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatRadioModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,

    // Material Table
    MatTableModule,       // pour <mat-table>
    MatPaginatorModule,   // pour <mat-paginator>
    MatSortModule   ],
  templateUrl: './historique.component.html'
})
export class HistoriqueComponent implements OnInit {
  // filtres
  filterQuery = '';
  filterLocation = '';
  filterSource = '';
  dateFrom = '';
  dateTo = '';
  allLocations: string[] = [];
  locationControl = new FormControl('');
  filteredOptions!: Observable<string[]>;
  // autocomplète
  naf: any[] = [];
  villes: string[] = [];
  departements: string[] = [];
  regions: string[] = [];
  nafControl = new FormControl('');
  filteredNaf!: Observable<any[]>;
  // pagination
  page = 1;
  perPage = 10;
  total = 0;
  totalPages = 1;

  rows: HistoryRow[] = [];


  displayedColumns: string[] = [
    'history_id', 'scraped_at', 'query', 'location', 'source',
    'name', 'address', 'phone', 'website', 'plus_code', 'note', 'horaires'
  ];
  dataSource = new MatTableDataSource<HistoryRow>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private api: ApiService, private http: HttpClient) { }

  ngOnInit() {
    this.loadFiltersData();
    this.loadPage(1);


    this.filteredOptions = this.locationControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map(value => this._filterLocation(value || ''))
    );

    // filtre NAF
    this.filteredNaf = this.nafControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterNaf(value || ''))
    );
  }

  private _filterLocation(value: string): string[] {
    if (value.length < 2) {
      return []; // n'affiche rien tant que < 2 caractères
    }
  
    const filterValue = value.toLowerCase();
  
    return this.allLocations
      .filter(loc => loc.toLowerCase().startsWith(filterValue)) // startWith exact
      .slice(0, 50); // optionnel : limite à 50 résultats max
  }

  private _filterNaf(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.naf.filter(n =>
      n.label.toLowerCase().includes(filterValue) ||
      n.id.toLowerCase().includes(filterValue)
    );
  }
  loadFiltersData() {
    this.http.get<any[]>('assets/naf-activity.json')
      .subscribe(d => this.naf = d);

    this.http.get<any[]>('assets/villes.json')
      .subscribe(d => {
        this.villes = d.map(v => v.Nom_commune);
        this.updateAllLocations();
      });

    this.http.get<any[]>('assets/dep_names.json')
      .subscribe(d => {
        this.departements = d.map(x => x.departement);
        this.updateAllLocations();
      });

    this.http.get<string[]>('assets/reg_names.json')
      .subscribe(d => {
        this.regions = d;
        this.updateAllLocations();
      });
  }
  _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.allLocations.filter(option =>
      option.toLowerCase().includes(filterValue)
    );
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  private updateAllLocations() {
    this.allLocations = [...this.villes, ...this.departements, ...this.regions];
  }
  loadPage(p: number) {
    this.page = p;
    this.api.historique({
      page: this.page,
      per_page: this.perPage,
      query: this.filterQuery,
      location: this.filterLocation,
      source: this.filterSource,
      date_from: this.dateFrom || undefined,
      date_to: this.dateTo || undefined
    }).subscribe(res => {
      this.rows = res.historique;
      this.total = res.total;
      this.perPage = res.per_page;
      this.totalPages = Math.ceil(this.total / this.perPage);

      // Material Table
      this.dataSource.data = this.rows;

    });
  }

  applyFilters() {
    this.filterQuery = this.nafControl.value || '';
    this.filterLocation = this.locationControl.value || '';
    this.loadPage(1);
  }
  resetFilters() {
    this.filterQuery = '';
    this.filterLocation = '';
    this.filterSource = '';
    this.dateFrom = '';
    this.dateTo = '';

    // Réinitialiser les champs autocomplete
    this.nafControl.reset('');
    this.locationControl.reset('');

    this.loadPage(1);
  }

  exportCSV() {
    // pagination par lots pour gros exports
    const perPage = 500;
    let p = 1;
    const all: HistoryRow[] = [];
    const loadNext = () => {
      this.api.historique({
        page: p, per_page: perPage,
        query: this.filterQuery, location: this.filterLocation, source: this.filterSource,
        date_from: this.dateFrom || undefined, date_to: this.dateTo || undefined
      }).subscribe(res => {
        all.push(...res.historique);
        if (res.historique.length < perPage) this.makeCsv(all);
        else { p++; loadNext(); }
      });
    };
    loadNext();
  }
  onPageChange(event: PageEvent) {
    this.perPage = event.pageSize;
    this.loadPage(event.pageIndex + 1);
  }
  private makeCsv(rows: HistoryRow[]) {
    if (!rows.length) return alert('Aucune donnée à exporter');
    const head = 'ID;Date Scraping;Query;Location;Source;Nom;Adresse;Téléphone;Site Web;Plus Code;Note;Horaires';
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map(r => [
      r.history_id, r.scraped_at, esc(r.query), esc(r.location), r.source,
      esc(r.name), esc(r.address), esc(r.phone), esc(r.website), esc(r.plus_code), esc(r.note), esc(r.horaires)
    ].join(';'));
    const csv = '\uFEFF' + [head, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'historique_filtré.csv'; a.click();
  }

  formatFRDate(str: string) {
    const d = new Date(str.replace(' ', 'T'));
    if (isNaN(+d)) return str;
    return d.toLocaleString('fr-FR', { year: 'numeric', month: 'long', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
