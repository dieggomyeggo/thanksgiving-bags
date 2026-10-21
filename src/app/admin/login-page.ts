import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink, MatCard, MatCardContent, MatFormField, MatLabel, MatInput, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap narrow">
      <h1>Admin sign-in</h1>
      <mat-card appearance="outlined">
        <mat-card-content>
          @if (sent()) {
            <p>Check <b>{{ email() }}</b> for a sign-in link. It opens this page signed in.</p>
          } @else {
            <p class="muted">Enter the owner email. You'll get a one-time link (no password). Only the allowlisted address can use the admin.</p>
            <form (submit)="$event.preventDefault(); send()">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Owner email</mat-label>
                <input matInput type="email" name="email" [(ngModel)]="email" autocomplete="email" required>
              </mat-form-field>
              @if (error()) { <div class="notice err" role="alert">{{ error() }}</div> }
              <button mat-flat-button type="submit" [disabled]="busy() || !email()">{{ api.isMock ? 'Enter demo admin' : 'Email me a link' }}</button>
            </form>
          }
        </mat-card-content>
      </mat-card>
      <p><a routerLink="/">← Back to the shop</a></p>
    </div>
  `,
  styles: `.narrow { max-width: 480px; } .full { width: 100%; }`,
})
export class LoginPage {
  protected readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly email = signal('');
  protected readonly sent = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Returning from the magic link (or already signed in).
    void this.api.isAdmin().then((ok) => ok && this.router.navigate(['/admin']));
  }

  protected async send(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.signInWithEmail(this.email().trim());
      if (this.api.isMock) await this.router.navigate(['/admin']);
      else this.sent.set(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not send the link');
    } finally {
      this.busy.set(false);
    }
  }
}
