import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { CommonModule } from '@angular/common';
// Importation des icônes Font Awesome

import { 
  faUser, 
  faLock, 
  faSignInAlt, 
  faDatabase,
  faSpinner 
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-login',
  imports: [CommonModule,ReactiveFormsModule],
  styleUrls: ['./login.component.scss'],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  loading = false;
  error = '';
  form:any;
  captchaQuestion = '';
  captchaAnswer = 0;
  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
        username: ['', Validators.required],
        password: ['', Validators.required],
        captcha: ['', Validators.required]
      });
      this.generateCaptcha();
  }
 
  submit() {
    if (this.form.invalid) return;
    const { captcha } = this.form.value;
    if (parseInt(captcha!, 10) !== this.captchaAnswer) {
      this.error = 'Captcha incorrect. Veuillez réessayer.';
      this.generateCaptcha();
      return;
    }
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
  generateCaptcha() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    this.captchaQuestion = `${a} + ${b}`;
    this.captchaAnswer = a + b;
    this.form.patchValue({ captcha: '' });
  }
}
