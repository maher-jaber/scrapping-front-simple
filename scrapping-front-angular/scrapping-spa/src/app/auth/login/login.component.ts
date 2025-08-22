import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  loading = false;
  error = '';
  form:any;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
        username: ['', Validators.required],
        password: ['', Validators.required]
      });
  }
 
  submit() {
    if (this.form.invalid) return;
    this.loading = true; this.error = '';
    const { username, password } = this.form.value;
    this.auth.login(username!, password!).subscribe({
      next: () => this.router.navigate(['/scraping']),
      error: err => {
        this.error = err?.error?.detail || 'Login échoué';
        this.loading = false;
      }
    });
  }
}
