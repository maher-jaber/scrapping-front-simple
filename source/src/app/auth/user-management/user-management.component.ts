import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
declare var bootstrap: any;

interface User {
  id: number;
  username: string;
  role: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {

  form!: FormGroup;
  users: User[] = [];
  selectedUser: User | null = null;
  message = '';
  error = '';
  passwordTarget: User | null = null;
  newPassword = '';
  apiUrl;
  constructor(private fb: FormBuilder, private http: HttpClient, private auth: AuthService) {
    this.apiUrl=environment.apiUrl;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(4)]],
      role: ['user', Validators.required]
    });

    this.loadUsers();
  }

  /** 🔹 Charger tous les utilisateurs */
  loadUsers() {
    this.http.get<User[]>(this.apiUrl+'/api/users').subscribe({
      next: (data) => this.users = data,
      error: () => this.error = 'Erreur lors du chargement'
    });
  }

  /** 🔹 Ajouter ou modifier un utilisateur */
  submit() {
    if (this.form.invalid) return;
    const { username, password, role } = this.form.value;

    if (this.selectedUser) {
      // ✏️ Modification
      this.http.put(this.apiUrl+`/api/users/${this.selectedUser.id}`, { username, role }).subscribe({
        next: () => {
          this.message = 'Utilisateur modifié avec succès';
          this.error = '';
          this.loadUsers();
          this.resetForm();
        },
        error: () => this.error = 'Erreur lors de la modification'
      });
    } else {
      // ➕ Ajout
      this.auth.register(username, password, role).subscribe({
        next: () => {
          this.message = 'Utilisateur créé avec succès';
          this.error = '';
          this.loadUsers();
          this.resetForm();
        },
        error: () => this.error = 'Erreur lors de la création'
      });
    }
  }

  /** 🔹 Sélectionner pour modification */
  editUser(user: User) {
    this.selectedUser = user;
    this.form.patchValue({
      username: user.username,
      role: user.role,
      password: ''  // on ne modifie pas le mot de passe ici
    });
  }

  /** 🔹 Supprimer un utilisateur */
  deleteUser(user: User) {
    if (confirm(`Supprimer ${user.username} ?`)) {
      this.http.delete(this.apiUrl+`/api/users/${user.id}`).subscribe({
        next: () => {
          this.message = 'Utilisateur supprimé';
          this.loadUsers();
        },
        error: () => this.error = 'Erreur lors de la suppression'
      });
    }
  }

  resetForm() {
    this.selectedUser = null;
    this.form.reset({ role: 'user' });
  }

  openPasswordModal(user: User) {
    this.passwordTarget = user;
    this.newPassword = '';
    const modalEl = document.getElementById('passwordModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
  
  changePassword() {
    if (!this.passwordTarget || !this.newPassword) return;
  
    this.http.put(this.apiUrl+`/api/users/${this.passwordTarget.id}/password`, { password: this.newPassword }).subscribe({
      next: () => {
        this.message = 'Mot de passe changé avec succès';
        const modalEl = document.getElementById('passwordModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
      },
      error: () => this.error = 'Erreur lors du changement du mot de passe'
    });
  }
}
