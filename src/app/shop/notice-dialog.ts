import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';

export interface NoticeData {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/** Used for the large-order note and the unavailable-item notice. Closes with true on confirm. */
@Component({
  selector: 'app-notice-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content class="body">{{ data.body }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.cancelLabel) {
        <button mat-button [mat-dialog-close]="false">{{ data.cancelLabel }}</button>
      }
      <button mat-flat-button [mat-dialog-close]="true" cdkFocusInitial>{{ data.confirmLabel ?? 'OK' }}</button>
    </mat-dialog-actions>
  `,
  styles: `.body { white-space: pre-line; }`,
})
export class NoticeDialog {
  protected readonly data = inject<NoticeData>(MAT_DIALOG_DATA);
}
