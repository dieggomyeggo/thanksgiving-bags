import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatOption, MatSelect } from '@angular/material/select';
import { BagStore } from './bag.store';

@Component({
  selector: 'app-checkout-form',
  imports: [FormsModule, MatFormField, MatLabel, MatError, MatHint, MatInput, MatSelect, MatOption, MatRadioGroup, MatRadioButton, MatCheckbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form #f="ngForm" class="form" (submit)="$event.preventDefault()" novalidate>
      <fieldset>
        <legend>How do you want it?</legend>
        <mat-radio-group [(ngModel)]="s.method" name="method" aria-label="Fulfillment method">
          <mat-radio-button value="deliver">Local delivery (1 hr around Johnston)</mat-radio-button>
          <mat-radio-button value="pickup">Pickup (Johnston, IA area)</mat-radio-button>
          <mat-radio-button value="ship">Ship (US, you pay shipping)</mat-radio-button>
        </mat-radio-group>
      </fieldset>

      @if (s.method() !== 'pickup') {
        <mat-form-field appearance="outline">
          <mat-label>Street address</mat-label>
          <input matInput [(ngModel)]="s.address" name="address" autocomplete="street-address" required>
          <mat-error>Address needed</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>ZIP</mat-label>
          <input matInput [(ngModel)]="s.zip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="10" required>
          @if (s.method() === 'deliver') { <mat-hint>Used to check the delivery area</mat-hint> }
          <mat-error>5-digit ZIP needed</mat-error>
        </mat-form-field>
      } @else {
        <p class="muted">{{ s.settings().pickupNote }}</p>
      }

      <mat-form-field appearance="outline">
        <mat-label>Name</mat-label>
        <input matInput [(ngModel)]="s.name" name="name" autocomplete="name" required>
        <mat-error>Name needed</mat-error>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Email</mat-label>
        <input matInput type="email" [(ngModel)]="s.email" name="email" autocomplete="email" required email>
        <mat-error>A valid email is needed</mat-error>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>{{ s.payMethod() === 'cash' ? 'Phone (needed for cash)' : 'Phone (optional)' }}</mat-label>
        <input matInput type="tel" [(ngModel)]="s.phone" name="phone" autocomplete="tel" [required]="s.payMethod() === 'cash'">
        <mat-error>Phone needed so I can confirm cash by text</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>How will you pay?</mat-label>
        <mat-select [(ngModel)]="s.payMethod" name="pay">
          <mat-option value="zelle">Zelle (free)</mat-option>
          <mat-option value="venmo">Venmo</mat-option>
          <mat-option value="cashapp">Cash App</mat-option>
          <mat-option value="cash">Cash on pickup/delivery (I confirm by text)</mat-option>
        </mat-select>
      </mat-form-field>

      <!-- Honeypot: invisible to people, tempting to bots. Anything typed here is rejected server-side. -->
      <div class="hp" aria-hidden="true">
        <label>Website <input type="text" [(ngModel)]="s.website" name="website" tabindex="-1" autocomplete="off"></label>
      </div>

      <p class="muted privacy">
        We use your name, email and address only to fulfill and update you about your order. They're stored in a private database,
        deleted by Dec 31, and never sold or shared. If you tick the boxes below, I'll email you once to ask how you liked it and/or
        list your name in the donation announcement.
      </p>
      <mat-checkbox [(ngModel)]="s.optFollowup" name="optFollowup">Email me once to ask how I liked it</mat-checkbox>
      <mat-checkbox [(ngModel)]="s.optShoutout" name="optShoutout">List my name in the donation announcement</mat-checkbox>
    </form>
  `,
  styles: `
    .form { display: flex; flex-direction: column; gap: 4px; }
    fieldset { border: 0; padding: 0; margin: 0 0 8px; }
    legend { font-weight: 600; margin-bottom: 4px; }
    mat-radio-group { display: flex; flex-direction: column; }
    .privacy { font-size: 12px; margin: 4px 0; }
  `,
})
export class CheckoutForm {
  protected readonly s = inject(BagStore);
}
