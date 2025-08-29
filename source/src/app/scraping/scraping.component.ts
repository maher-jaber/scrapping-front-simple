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
import Swal from 'sweetalert2';
import { GeoService } from '../core/geo.service';

declare var bootstrap: any;

@Component({
    selector: 'app-scraping',
    imports: [
        FormsModule,
        CommonModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatInputModule,
        MatFormFieldModule,

    ],
    styleUrls: ['./scraping.component.scss'],
    templateUrl: './scraping.component.html',
})

export class ScrapingComponent implements OnInit, OnDestroy {



    private statusInterval: any;
    private scrapingInProgress = false; // Nouvelle variable pour suivre l'état
    private scrapingSubscription: any; // Pour gérer l'abonnement
    inProgress: any[] = [];
    // Observables pour l'autocomplete
    filteredNafOptions!: Observable<any[]>;
    filteredRegionOptions!: Observable<string[]>;
    filteredDepartementOptions!: Observable<any[]>;
    filteredVilleOptions!: Observable<string[]>;

    // datasets
    regions: string[] = [];
    departements: { code_departement: string; nom_departement: string; nom_region: string }[] = [];
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
    totalTimeSrapping = '';

    // exclusivité région/département/ville
    regionDisabled = false;
    depDisabled = false;
    villeDisabled = false;
    form: any;

    private scrapingModal: any;

    progress = 0;
    currentItem = 0;
    totalItems = 0;

    totalPages = 0;
    progressPercent = 0;       // valeur de la progress bar
    currentCompany: any = null; // dernière entreprise scrappée
    exportChoice: 'all' | 'scrapped' | 'new' = 'all';
    private exportModal: any;
    messages: string[] = [
        "Scraping en cours...",
        "Analyse des données...",
        "Presque terminé..."
    ];
    currentMessage: string = "";
    msgIndex = 0;
    charIndex = 0;
    scrapedLocations: string[] = []; // stocke les villes déjà scrapées
    scrapedLocationsMap: { [key: string]: number } = {};

    constructor(private fb: FormBuilder, private api: ApiService, private geoService: GeoService, private http: HttpClient) {
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
        /* this.http.get<string[]>('assets/reg_names.json').subscribe(d => {
             this.regions = d.sort();
             this.setupAutocomplete();
         });
 
         this.http.get<any[]>('assets/dep_names.json').subscribe(d => {
             this.departements = d.sort((a, b) => a.departement.localeCompare(b.departement));
         });
 
         this.http.get<any[]>('assets/villes.json').subscribe(d => {
             this.villes = d.map(v => v.Nom_commune);
         });*/
        this.geoService.getAll().subscribe(({ regions, departements, communes }) => {
            this.regions = regions;
            this.departements = departements;
            this.villes = communes;
            this.setupAutocomplete();
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
        this.typeWriter();
        this.updateCities();

    }
    private updateCities() {
        // ⬅️ Charger les villes déjà scrapées
        this.api.getScrapedLocations().subscribe((res: { locations: { location: string, times_scraped: number }[] }) => {
            // On transforme pour la liste de villes
            this.scrapedLocations = res.locations.map(l => l.location);

            // On prépare un mapping location → nombre de scrapes
            this.scrapedLocationsMap = {};
            res.locations.forEach(l => {
                this.scrapedLocationsMap[l.location] = l.times_scraped;
            });
        });
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
                        : (value as DepartementOption)?.nom_departement || ''
                )
            )
        );

        // Autocomplete Ville
        this.filteredVilleOptions = this.form.get('ville')!.valueChanges.pipe(
            startWith(''),
            map(value => this._filterVille(typeof value === 'string' ? value : ''))
        );
    }
    copyToClipboard(value: string) {
        if (!value) return;
        navigator.clipboard.writeText(value).then(() => {
            // Optionnel : message console ou toast
            Swal.fire({
                title: 'Félicitations !',
                text: 'Texte copié',
                icon: 'success',
                showConfirmButton: false,
                timer: 2000,           // disparaît après 2 secondes
                timerProgressBar: true // barre de progression optionnelle
            });

        }).catch(err => {
            console.error('Erreur de copie:', err);
        });
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

            Swal.fire({
                title: 'Erreur !',
                text: '"Aucun résultat pour ce filtre"',
                icon: 'error',
                confirmButtonText: 'OK'
            });
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
        a.download = this.buildCsvFilename();
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
            option.nom_departement.toLowerCase().includes(filterValue) ||
            option.code_departement.toLowerCase().includes(filterValue) ||
            option.nom_region.toLowerCase().includes(filterValue)
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
    displayDepartementFn(dep: DepartementOption | string): string {
        if (!dep) return '';
        if (typeof dep === 'string') return dep; // si l’utilisateur tape du texte libre
        return `${dep.code_departement} - ${dep.nom_departement} - ${dep.nom_region}`;
    }

    setSource(val: 'googlemaps' | 'pagesjaunes') { this.source = val; }

    onRegionChange($event: any) {
        const v = this.form.value.region;
        if (v && typeof v === 'string' && v.trim() !== '') {
            this.form.get('departement')?.disable();
            this.form.get('ville')?.disable();
        } else {
            this.form.get('departement')?.enable();
            this.form.get('ville')?.enable();
        }
    }

    onDepChange($event: any) {
        const v = this.form.value.departement;
        const label = typeof v === 'object' ? v.nom_departement : v; // corrige ici
        if (label && label.trim() !== '') {
            this.form.get('region')?.disable();
            this.form.get('ville')?.disable();
        } else {
            this.form.get('region')?.enable();
            this.form.get('ville')?.enable();
        }
    }

    onVilleChange($event: any) {
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
    get progressPercentValue(): number {
        if (!this.currentCompany) return 0;
        return Math.min(100, Math.round((this.currentCompany.current_index / this.currentCompany.total) * 100));
    }

    get lastCompany(): any {
        return this.currentCompany;
    }
    submit() {
        if (this.form.invalid) return;
        if (this.scrapingInProgress) {
            // Si déjà en cours, on ne fait rien ou on propose d'arrêter
            return;
        }

        const f = this.form.value;
        const query = typeof f.query === 'string' ? f.query : f.query?.label;
        const location =
            f.ville ||
            (typeof f.departement === 'string' ? f.departement : f.departement?.nom_departement) ||
            f.region;

        if (!location || !query || !(0 < f.max_results && f.max_results <= 1000)) {
            Swal.fire({
                title: 'Erreur !',
                text: 'Vous devez remplir tous les champs !',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return;
        }

        this.scrapingInProgress = true; // Marquer le scraping comme démarré
        this.loading = true;
        this.startTime = Date.now();
        this.elapsed = '0m 0s';
        this.currentCompany = { total: 0, current_index: 0 };
        this.progressPercent = 0;

        // Ouvre modal
        this.scrapingModal.show();

        // ⬅ Polling pour récupérer le statut
        this.statusInterval = setInterval(async () => {
            try {
                const res: any = await this.api.getStatus(this.source).toPromise();
                if (res.in_progress) {
                    this.currentCompany = res.in_progress;
                    this.progressPercent = Math.min(100, Math.round((res.in_progress.current_index / f.max_results) * 100));
                }
            } catch (e) {
                console.error('Erreur récupération statut:', e);
            }
        }, 2500);

        const timer = setInterval(() => this.updateElapsed(), 1000);

        // Stocker la souscription pour pouvoir l'annuler
        this.scrapingSubscription = this.api.scrape(this.source, {
            query: f.query.label!,
            location: location!,
            max_results: f.max_results!
        }).subscribe({
            next: (res) => {
                this.handleScrapingComplete(res, timer);
            },
            error: (err) => {
                this.handleScrapingError(err, timer);
            }
        });
    }

    private handleScrapingComplete(res: any, timer: any) {

        this.results = res.results || [];
        this.totalPages = Math.ceil(this.results.length / this.itemsPerPage);


        this.currentPage = 1;
        this.updatePage();
        this.loading = false;
        this.scrapingInProgress = false;
        clearInterval(timer);
        clearInterval(this.statusInterval);
        this.updateElapsed(true);
        this.scrapingModal.hide();
        this.updateCities();
        Swal.fire({
            title: 'Succès !',
            text: 'Scraping terminé avec succès',
            icon: 'success',
            confirmButtonText: 'OK'
        });
    }

    private handleScrapingError(err: any, timer: any) {
        this.loading = false;
        this.scrapingInProgress = false;
        clearInterval(timer);
        clearInterval(this.statusInterval);

        // Cas spécifique si le scraping est déjà en cours
        if (err?.status === 400 && err?.error?.detail?.includes("déjà en cours")) {
            Swal.fire({
                title: 'Scraping déjà actif',
                text: err.error.detail,
                icon: 'warning',
                confirmButtonText: 'OK'
            }).then(() => {
                // On cache le modal après que l'utilisateur ait cliqué sur OK
                this.scrapingModal.hide();
            });
            return;
        }

        // Erreur générique
        Swal.fire({
            title: 'Erreur !',
            text: `Erreur scraping: ${err?.error?.message || err.message || err}`,
            icon: 'error',
            confirmButtonText: 'OK'
        }).then(() => {
            // Cache le modal après la fermeture de SweetAlert
            this.scrapingModal.hide();
        });
    }



    stopScraping() {
        if (!this.scrapingInProgress) return;

        Swal.fire({
            title: 'Arrêter le scraping ?',
            text: 'Êtes-vous sûr de vouloir arrêter le scraping en cours ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Oui, arrêter',
            cancelButtonText: 'Non, continuer'
        }).then((result) => {
            if (result.isConfirmed) {
                this.api.stopScraping(this.source).subscribe({
                    next: (response) => {
                        this.scrapingInProgress = false;
                        if (this.scrapingSubscription) {
                            this.scrapingSubscription.unsubscribe();
                        }
                        clearInterval(this.statusInterval);
                        this.scrapingModal.hide();

                        Swal.fire({
                            title: 'Arrêté !',
                            text: response.message || 'Scrapping arrêté avec succès',
                            icon: 'info',
                            confirmButtonText: 'OK'
                        });
                    },
                    error: (err) => {
                        Swal.fire({
                            title: 'Erreur !',
                            text: `Erreur lors de l'arrêt: ${err?.error?.message || err.message || err}`,
                            icon: 'error',
                            confirmButtonText: 'OK'
                        });
                    }
                });
            }
        });
    }

    updateElapsed(final = false) {
        if (!this.startTime) return;

        const elapsedSecs2 = Math.floor((Date.now() - this.startTime) / 1000);
        const h = Math.floor(elapsedSecs2 / 3600);
        const m = Math.floor((elapsedSecs2 % 3600) / 60);
        const s = elapsedSecs2 % 60;

        this.totalTimeSrapping = `${h}h ${m}m ${s}s`;

        // On ne s'intéresse qu'au temps restant
        if (!final && this.progressPercent > 0 && this.progressPercent < 100) {
            const elapsedSecs = Math.floor((Date.now() - this.startTime) / 1000);
            const remainingSecs = Math.floor(elapsedSecs * (100 - this.progressPercent) / this.progressPercent);

            const hours = Math.floor(remainingSecs / 3600);
            const minutes = Math.floor((remainingSecs % 3600) / 60);
            const seconds = remainingSecs % 60;

            if (hours > 0) {
                this.elapsed = `${hours}h ${minutes}m ${seconds}s restantes`;
            } else {
                this.elapsed = `${minutes}m ${seconds}s restantes`;
            }

        } else if (final || this.progressPercent >= 100) {
            this.elapsed = `0m 0s restantes`;
        } else {
            this.elapsed = `Calcul en cours...`;
        }
    }

    updatePage() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        this.paginated = this.results.slice(start, start + this.itemsPerPage);
    }
    visiblePages(): (number | string)[] {
        const pages: (number | string)[] = [];
        const delta = 2;
        const left = Math.max(2, this.currentPage - delta);
        const right = Math.min(this.totalPages - 1, this.currentPage + delta);

        pages.push(1);
        if (left > 2) pages.push('...');
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < this.totalPages - 1) pages.push('...');
        if (this.totalPages > 1) pages.push(this.totalPages);

        return pages;
    }

    goToPage(p: number | string) {
        if (p === '...') return;
        this.currentPage = p as number;
        this.updatePage();
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
        a.download = this.buildCsvFilename();
        a.click();
    }
    private buildCsvFilename(): string {
        const f = this.form.value;

        // code NAF
        const codeNaf = typeof f.query === 'object' ? f.query.id : (f.query || 'NAF');

        // location (ville / dep / région)
        const location =
            f.ville ||
            (typeof f.departement === 'string' ? f.departement : f.departement?.departement) ||
            f.region || 'Location';

        // timestamp
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours()}h${now.getMinutes()}m`;

        // nettoyer caractères spéciaux
        const safeCode = String(codeNaf).replace(/[^a-zA-Z0-9_-]/g, '');
        const safeLoc = String(location).replace(/[^a-zA-Z0-9_-]/g, '');

        return `${safeCode}_${safeLoc}_${timestamp}.csv`;
    }

    formatFRDate(str?: string) {
        if (!str) return '';
        const d = new Date(str.replace(' ', 'T'));
        if (isNaN(+d)) return str;
        return d.toLocaleString('fr-FR', { year: 'numeric', month: 'long', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    goToNextPage() {
        if (this.currentPage < this.totalPages) {
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
    typeWriter() {
        if (this.charIndex < this.messages[this.msgIndex].length) {
            this.currentMessage += this.messages[this.msgIndex].charAt(this.charIndex);
            this.charIndex++;
            setTimeout(() => this.typeWriter(), 100); // vitesse de frappe
        } else {
            setTimeout(() => this.eraseWriter(), 2000); // pause avant effacer
        }
    }

    eraseWriter() {
        if (this.charIndex > 0) {
            this.currentMessage = this.currentMessage.substring(0, this.charIndex - 1);
            this.charIndex--;
            setTimeout(() => this.eraseWriter(), 50);
        } else {
            this.msgIndex = (this.msgIndex + 1) % this.messages.length;
            setTimeout(() => this.typeWriter(), 500);
        }
    }
    ngOnDestroy() {
        // Nettoyage si nécessaire
    }
}