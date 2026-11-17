import { Component, signal, inject, OnInit, OnDestroy, DestroyRef, NgZone } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { NgIf } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingService } from '../../../core/services/booking.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { ReceiptPdfService } from '../../../core/services/receipt-pdf.service';
import { Booking } from '../../../core/models/booking.model';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';

@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [RouterLink, NgIf, FcfaPipe],
  templateUrl: './booking-confirmation.component.html',
  styleUrl: './booking-confirmation.component.scss',
})
export class BookingConfirmationComponent implements OnInit, OnDestroy {
  private bookingService = inject(BookingService);
  private wsService = inject(WebSocketService);
  private receiptPdf = inject(ReceiptPdfService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private ngZone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  booking = signal<Booking | null>(null);
  paymentFailed = signal(false);
  isPending = signal(false);
  verifying = signal(false);
  private pollingInterval: any = null;
  private verifyTimeout: any = null;
  private maxPollingTimeout: any = null;

  // Fallback mock data for demonstration
  readonly mockBooking = {
    fieldName: 'Green Valley Stadium',
    sport: 'Football',
    sportIcon: 'sports_soccer',
    date: 'Lundi 12 Juin 2025',
    startTime: '08:00',
    endTime: '09:00',
    reference: '#BK-2025-0847',
    total: 27500,
  };

  ngOnInit(): void {
    const bookingId = this.route.snapshot.queryParamMap.get('bookingId')
      ?? sessionStorage.getItem('pendingBookingId')
      ?? this.bookingService.pendingBooking()?.id;

    sessionStorage.removeItem('pendingBookingId');

    if (!bookingId) return;

    // 1. Chargement initial
    this.loadBooking(bookingId);

    // 2. WebSocket pour confirmation instantanée
    this.connectWebSocket(bookingId);

    // 3. Polling de secours (toutes les 3s pendant 60s max)
    this.startPolling(bookingId);

    // 4. Vérification API après 10s si toujours pending
    this.verifyTimeout = setTimeout(() => {
      if (this.isPending()) {
        this.verifyPaymentStatus(bookingId);
      }
    }, 10000);

    // 5. Message final après 60s
    this.maxPollingTimeout = setTimeout(() => {
      if (this.isPending()) {
        this.verifying.set(true);
      }
    }, 60000);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    if (this.verifyTimeout) clearTimeout(this.verifyTimeout);
    if (this.maxPollingTimeout) clearTimeout(this.maxPollingTimeout);
    this.wsService.disconnect();
  }

  private loadBooking(bookingId: string): void {
    this.bookingService.getBookingById(bookingId).subscribe({
      next: (b) => {
        if (b) {
          this.booking.set(b);
          this.paymentFailed.set(b.status === 'cancelled');
          this.isPending.set(b.status === 'pending');
          
          // Si déjà confirmé, arrêter le polling
          if (b.status === 'confirmed') {
            this.cleanup();
          }
        }
      },
    });
  }

  private connectWebSocket(bookingId: string): void {
    this.wsService.connect();
    this.wsService.joinBooking(bookingId);

    this.wsService.onPaymentConfirmed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ngZone.run(() => {
        this.loadBooking(bookingId);
        this.cleanup();
      }));

    this.wsService.onPaymentFailed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ngZone.run(() => {
        this.paymentFailed.set(true);
        this.isPending.set(false);
        this.cleanup();
      }));
  }

  private startPolling(bookingId: string): void {
    let elapsed = 0;
    this.pollingInterval = setInterval(() => {
      elapsed += 3000;
      if (elapsed > 60000) {
        clearInterval(this.pollingInterval);
        return;
      }
      
      this.bookingService.getBookingById(bookingId).subscribe({
        next: (b) => {
          if (b && b.status !== 'pending') {
            this.booking.set(b);
            this.paymentFailed.set(b.status === 'cancelled');
            this.isPending.set(false);
            this.cleanup();
          }
        },
      });
    }, 3000);
  }

  private verifyPaymentStatus(bookingId: string): void {
    // Appel à un nouvel endpoint backend pour forcer la vérification
    this.bookingService.verifyBookingPayment(bookingId).subscribe({
      next: (b) => {
        if (b) {
          this.booking.set(b);
          this.paymentFailed.set(b.status === 'cancelled');
          this.isPending.set(b.status === 'pending');
          
          if (b.status === 'confirmed') {
            this.cleanup();
          }
        }
      },
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  downloadTicket(): void {
    const b = this.booking();
    if (b) {
      this.receiptPdf.generateReceipt(b);
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  retryPayment(): void {
    const b = this.booking();
    if (b) {
      this.router.navigate(['/booking/payment'], { queryParams: { bookingId: b.id } });
    }
  }

  shareWhatsApp(): void {
    const b = this.booking();
    if (!b) return;
    const msg = `Réservation confirmée sur EasyArena !\nTerrain : ${b.fieldName}\nDate : ${this.formatDate(b.date)}\nHoraire : ${b.startTime} - ${b.endTime}\nMontant : ${b.pricing.total} FCFA`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }
}
