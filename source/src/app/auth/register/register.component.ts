import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  message = ''; error = '';
  form:any;

  constructor(private fb: FormBuilder, private auth: AuthService) {

    this.form = this.fb.group({
        username: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(4)]]
      });
  }

  submit() {
    if (this.form.invalid) return;
    const { username, password } = this.form.value;
    this.auth.register(username!, password!).subscribe({
      next: (res: any) => { this.message = res.message || 'Compte créé'; this.error = ''; },
      error: err => { this.error = err?.error?.detail || 'Erreur'; this.message = ''; }
    });
  }
}
