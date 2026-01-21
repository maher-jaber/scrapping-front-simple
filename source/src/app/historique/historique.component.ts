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
import { finalize } from 'rxjs/operators';
import { MatProgressBarModule } from '@angular/material/progress-bar';

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
    MatProgressBarModule,
    // Material Table
    MatTableModule,       // pour <mat-table>
    MatPaginatorModule,   // pour <mat-paginator>
    MatSortModule   ],
    styleUrls: ['./historique.component.scss'],
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

  // dans la classe
  isLoadingTable = false;

  isExporting = false;
  exportProgress = 0;       // 0..100
  exportTotal: number | null = null;



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
    this.dataSource.sortingDataAccessor = (row, columnName) => {
      switch (columnName) {
        case 'scraped_at':
          return new Date(row.scraped_at); // tri réel par date
        case 'history_id':
          return Number(row.history_id); // tri numérique
        default:
          return (row as any)[columnName];
      }
    };
  }

  
  private updateAllLocations() {
    this.allLocations = [...this.villes, ...this.departements, ...this.regions];
  }
  loadPage(p: number, sort?: { active: string; direction: string }) {
    this.page = p;
  
    let sortBy: string | undefined = undefined;
    let sortOrder: 'asc' | 'desc' | undefined = undefined;
    if (sort && (sort.direction === 'asc' || sort.direction === 'desc')) {
      sortBy = sort.active;
      sortOrder = sort.direction;
    }
  
    const dateFromStr = this.dateFrom ? this.formatDateForAPI(this.dateFrom) : undefined;
    const dateToStr = this.dateTo ? this.formatDateForAPI(this.dateTo) : undefined;
  
    this.isLoadingTable = true;
  
    this.api.historique({
      page: this.page,
      per_page: this.perPage,
      query: this.filterQuery || undefined,
      location: this.filterLocation || undefined,
      source: this.filterSource || undefined,
      date_from: dateFromStr,
      date_to: dateToStr,
      sort_by: sortBy,
      sort_order: sortOrder
    })
    .pipe(finalize(() => (this.isLoadingTable = false)))
    .subscribe(res => {
      this.rows = res.historique;
      this.total = res.total;
      this.perPage = res.per_page;
      this.totalPages = Math.ceil(this.total / this.perPage);
      this.dataSource.data = this.rows;
    });
  }
  
  
  // Fonction utilitaire pour convertir les dates
  private formatDateForAPI(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
  }
  
  // Lors du clic sur un tri dans la table
  onSortChange(sort: { active: string; direction: string }) {
    this.loadPage(this.page, sort);
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
    if (this.isExporting) return;
  
    this.isExporting = true;
    this.exportProgress = 0;
    this.exportTotal = null;
  
    const perPage = 500;
    let p = 1;
    const all: HistoryRow[] = [];
  
    const dateFromStr = this.dateFrom ? this.formatDateForAPI(this.dateFrom) : undefined;
    const dateToStr = this.dateTo ? this.formatDateForAPI(this.dateTo) : undefined;
  
    const loadNext = () => {
      this.api.historique({
        page: p,
        per_page: perPage,
        query: this.filterQuery || undefined,
        location: this.filterLocation || undefined,
        source: this.filterSource || undefined,
        date_from: dateFromStr,
        date_to: dateToStr
      }).subscribe({
        next: (res) => {
          if (this.exportTotal == null && typeof res.total === 'number') {
            this.exportTotal = res.total;
          }
  
          all.push(...res.historique);
  
          if (this.exportTotal && this.exportTotal > 0) {
            const pct = Math.round((all.length / this.exportTotal) * 100);
            this.exportProgress = Math.min(99, Math.max(0, pct)); // 99% jusqu'au fichier final
          }
  
          if (res.historique.length < perPage) {
            this.makeCsv(all);
            this.exportProgress = 100;
            this.isExporting = false;
          } else {
            p++;
            loadNext();
          }
        },
        error: () => {
          this.isExporting = false;
          this.exportTotal = null;
          alert("Erreur pendant l'export CSV");
        }
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
