import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

/** Separate page for bigger orders. Intentionally never mentions the charity; it is not the QR destination. */
@Component({
  selector: 'app-learn-more-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap narrow">
      <h1>Learn more / bigger orders</h1>
      <p>Want more than a sample bag, or a regular supply of something you liked? I'm an independent business owner in the Johnston, IA area and I'm happy to talk through bigger orders.</p>
      @if (url()) {
        <p><a [href]="url()" rel="noopener" target="_blank">Visit my site</a></p>
      }
      <p>Reach me at <b>{{ email() }}</b> or text <b>{{ phone() }}</b>.</p>
      <p class="muted">Independent business owner. No health or product claims are made on this site; check labels for ingredients and allergens.</p>
      <p><a routerLink="/">← Back to the bag builder</a></p>
    </div>
  `,
  styles: `.narrow { max-width: 640px; }`,
})
export class LearnMorePage {
  private readonly api = inject(ApiService);
  protected readonly url = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');

  constructor() {
    void this.api.getSettings().then((s) => {
      this.url.set(/^https?:\/\//.test(s.learnMoreUrl) ? s.learnMoreUrl : '');
      this.email.set(s.contactEmail);
      this.phone.set(s.contactPhone);
    });
  }
}
