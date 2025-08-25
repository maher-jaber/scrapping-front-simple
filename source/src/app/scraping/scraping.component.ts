import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService, ScrapeResult } from '../core/api.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { NafOption } from '../models/NafOption';
import { DepartementOption } from '../models/DepartementOption';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
declare var bootstrap: any;

@Component({
    selector: 'app-scraping',
    imports: [
        FormsModule,
        CommonModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatInputModule,
        MatFormFieldModule
    ],
    styleUrls: ['./scraping.component.scss'],
    templateUrl: './scraping.component.html',
})

export class ScrapingComponent implements OnInit, OnDestroy {


    // Observables pour l'autocomplete
    filteredNafOptions!: Observable<any[]>;
    filteredRegionOptions!: Observable<string[]>;
    filteredDepartementOptions!: Observable<any[]>;
    filteredVilleOptions!: Observable<string[]>;

    // datasets
    regions: string[] = [];
    departements: { numero: string; departement: string; region: string }[] = [];
    villes: string[] = [];
    nafData: any[] = [];

    source: 'googlemaps' | 'pagesjaunes' = 'googlemaps';

    itemsPerPage = 10;
    currentPage = 1;
    results: ScrapeResult[] = [];
    paginated: ScrapeResult[] = [];

    loading = false;
    startTime?: number;
    elapsed = '';

    // exclusivité région/département/ville
    regionDisabled = false;
    depDisabled = false;
    villeDisabled = false;
    form: any;

    private scrapingModal: any;

    progress = 0;
    currentItem = 0;
    totalItems = 0;


    exportChoice: 'all' | 'scrapped' | 'new' = 'all';
    private exportModal: any;

    constructor(private fb: FormBuilder, private api: ApiService, private http: HttpClient) {
        this.form = this.fb.group({
            query: this.fb.control<string | NafOption>(''),
            region: this.fb.control<string>(''),
            departement: this.fb.control<string | DepartementOption>(''),
            ville: this.fb.control<string>(''),
            max_results: this.fb.control<number>(5, {
                validators: [Validators.required, Validators.min(1), Validators.max(1000)]
            }),
        });
    }

    ngOnInit() {
        this.http.get<string[]>('assets/reg_names.json').subscribe(d => {
            this.regions = d.sort();
            this.setupAutocomplete();
        });

        this.http.get<any[]>('assets/dep_names.json').subscribe(d => {
            this.departements = d.sort((a, b) => a.departement.localeCompare(b.departement));
        });

        this.http.get<any[]>('assets/villes.json').subscribe(d => {
            this.villes = d.map(v => v.Nom_commune);
        });

        this.http.get<any[]>('assets/naf-activity.json').subscribe(d => {
            this.nafData = d;
        });
        const modalEl = document.getElementById('scrapingModal');
        if (modalEl) {
            this.scrapingModal = new bootstrap.Modal(modalEl, {
                backdrop: 'static',
                keyboard: false
            });
        }
        const modalEl2 = document.getElementById('exportModal');
        if (modalEl2) {
          this.exportModal = new bootstrap.Modal(modalEl2, { backdrop: 'static', keyboard: false });
        }
    }

    private setupAutocomplete() {
        // Autocomplete NAF
        this.filteredNafOptions = this.form.get('query')!.valueChanges.pipe(
            startWith(''),
            map(value =>
                typeof value === 'string'
                    ? this._filterNaf(value)
                    : this._filterNaf((value as NafOption)?.label || '')
            )
        );

        // Autocomplete Région
        this.filteredRegionOptions = this.form.get('region')!.valueChanges.pipe(
            startWith(''),
            map(value => this._filterRegion(typeof value === 'string' ? value : ''))
        );

        // Autocomplete Département
        this.filteredDepartementOptions = this.form.get('departement')!.valueChanges.pipe(
            startWith(''),
            map(value =>
                this._filterDepartement(
                    typeof value === 'string'
                        ? value
                        : (value as DepartementOption)?.departement || ''
                )
            )
        );

        // Autocomplete Ville
        this.filteredVilleOptions = this.form.get('ville')!.valueChanges.pipe(
            startWith(''),
            map(value => this._filterVille(typeof value === 'string' ? value : ''))
        );
    }

    openExportModal() {
        if (!this.results.length) {
          alert('Aucun résultat');
          return;
        }
        this.exportModal.show();
      }
      confirmExport() {
        let filtered = this.results;
      
        if (this.exportChoice === 'scrapped') {
          filtered = this.results.filter(r => r.already_scrapped);
        } else if (this.exportChoice === 'new') {
          filtered = this.results.filter(r => !r.already_scrapped);
        }
      
        if (!filtered.length) {
          alert("Aucun résultat pour ce filtre");
          this.exportModal.hide();
          return;
        }
      
        const head = 'Nom;Adresse;Téléphone;Site Web;Plus Code;Horaires;Note;Scrapé à;Status';
        const rows = filtered.map(r => ([
          r.name || 'N/A',
          r.address || 'N/A',
          r.phone || 'N/A',
          r.website || 'N/A',
          r.plus_code || 'N/A',
          r.horaires || 'N/A',
          r.note || 'N/A',
          this.formatFRDate(r.scraped_at) || 'N/A',
          r.already_scrapped ? 'Deja scrappé' : 'Nouveau'
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')));
      
        const csv = '\uFEFF' + [head, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'resultats_scraping.csv';
        a.click();
      
        this.exportModal.hide();
      }

    private _filterNaf(value: string): any[] {
        if (typeof value !== 'string') return [];
        const filterValue = value.toLowerCase();
        return this.nafData.filter(option =>
            option.label.toLowerCase().includes(filterValue) ||
            option.id.toLowerCase().includes(filterValue)
        ).slice(0, 20);
    }

    private _filterRegion(value: string): string[] {
        if (typeof value !== 'string') return [];
        const filterValue = value.toLowerCase();
        return this.regions.filter(option =>
            option.toLowerCase().includes(filterValue)
        ).slice(0, 20);
    }

    private _filterDepartement(value: string): any[] {
        if (typeof value !== 'string') return [];
        const filterValue = value.toLowerCase();
        return this.departements.filter(option =>
            option.departement.toLowerCase().includes(filterValue) ||
            option.numero.toLowerCase().includes(filterValue) ||
            option.region.toLowerCase().includes(filterValue)
        ).slice(0, 20);
    }

    private _filterVille(value: string): string[] {
        if (typeof value !== 'string') return [];
        const filterValue = value.toLowerCase();
        return this.villes.filter(option =>
            option && option.toLowerCase().includes(filterValue)
        ).slice(0, 20);
    }

    displayNafFn(naf: any): string {
        return naf && naf.label ? `${naf.id} - ${naf.label}` : '';
    }

    displayDepartementFn(dep: any): string {
        return dep ? `${dep.numero} - ${dep.departement} - ${dep.region}` : '';
    }

    setSource(val: 'googlemaps' | 'pagesjaunes') { this.source = val; }

    onRegionChange($event:any) {
        const v = this.form.value.region;
        if (v && typeof v === 'string' && v.trim() !== '') {
          this.form.get('departement')?.disable();
          this.form.get('ville')?.disable();
        } else {
          this.form.get('departement')?.enable();
          this.form.get('ville')?.enable();
        }
      }
      
      onDepChange($event:any) {
        const v = this.form.value.departement;
        const label = typeof v === 'object' ? v.departement : v; // gère objet + string
        if (label && label.trim() !== '') {
          this.form.get('region')?.disable();
          this.form.get('ville')?.disable();
        } else {
          this.form.get('region')?.enable();
          this.form.get('ville')?.enable();
        }
      }
      
      onVilleChange($event:any) {
        const v = this.form.value.ville;
        if (v && typeof v === 'string' && v.trim() !== '') {
          this.form.get('region')?.disable();
          this.form.get('departement')?.disable();
        } else {
          this.form.get('region')?.enable();
          this.form.get('departement')?.enable();
        }
      }


    reset() {
        this.form.reset({ query: '', region: '', departement: '', ville: '', max_results: 5 });
        this.regionDisabled = this.depDisabled = this.villeDisabled = false;
        this.results = []; this.paginated = []; this.currentPage = 1; this.elapsed = '';
        this.form.get('region')?.enable();
        this.form.get('departement')?.enable();
        this.form.get('ville')?.enable();
    }

    submit() {
        if (this.form.invalid) return;

        const f = this.form.value;

        // Vérifications existantes
        const query = typeof f.query === 'string' ? f.query : f.query?.label;
        const location =
            f.ville ||
            (typeof f.departement === 'string' ? f.departement : f.departement?.departement) ||
            f.region;
        if (!location) {
            alert('Sélectionne une région, un département ou une ville');
            return;
        }

        this.loading = true;
        this.startTime = Date.now();
        this.elapsed = '0m 0s';

        // ⬅ Ouvrir modal
        this.scrapingModal.show();

        const timer = setInterval(() => this.updateElapsed(), 1000);

        this.api.scrape(this.source, {
            query: f.query.label!,
            location: location!,
            max_results: f.max_results!
        }).subscribe({
            next: (res) => {
                this.results = res.results || [];
                this.currentPage = 1;
                this.updatePage();
                this.loading = false;
                clearInterval(timer);
                this.updateElapsed(true);

                // ⬅ Fermer modal
                this.scrapingModal.hide();
            },
            error: (err) => {
                this.loading = false;
                clearInterval(timer);
                this.scrapingModal.hide(); // ⬅ Fermer modal aussi en cas d'erreur
                alert(`Erreur scraping: ${err?.error?.message || err.message || err}`);
            }
        });
    }

    updateElapsed(final = false) {
        if (!this.startTime) return;
        const secs = Math.floor((Date.now() - this.startTime) / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        this.elapsed = `${m}m ${s}s${final ? '' : ''}`;
    }

    updatePage() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        this.paginated = this.results.slice(start, start + this.itemsPerPage);
    }

    pages(): number[] {
        const total = Math.ceil(this.results.length / this.itemsPerPage);
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    exportCSV() {
        if (!this.results.length) return alert('Aucun résultat');
        const head = 'Nom;Adresse;Téléphone;Site Web;Plus Code;Horaires;Note;Scrapé à;Status';
        const rows = this.results.map(r => ([
            r.name || 'N/A',
            r.address || 'N/A',
            r.phone || 'N/A',
            r.website || 'N/A',
            r.plus_code || 'N/A',
            r.horaires || 'N/A',
            r.note || 'N/A',
            this.formatFRDate(r.scraped_at) || 'N/A',
            r.already_scrapped ? 'Deja scrappé' : 'Nouveau'
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')));
        const csv = '\uFEFF' + [head, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'resultats_scraping.csv';
        a.click();
    }

    formatFRDate(str?: string) {
        if (!str) return '';
        const d = new Date(str.replace(' ', 'T'));
        if (isNaN(+d)) return str;
        return d.toLocaleString('fr-FR', { year: 'numeric', month: 'long', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    goToNextPage() {
        if (this.currentPage < this.pages().length) {
            this.currentPage++;
            this.updatePage();
        }
    }

    goToPrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePage();
        }
    }

    ngOnDestroy() {
        // Nettoyage si nécessaire
    }
}