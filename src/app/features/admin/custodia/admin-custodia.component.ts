import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CustodiaInventarioComponent } from './custodia-inventario.component';
import { CustodiaPreguntasComponent } from './custodia-preguntas.component';
import { CustodiaReclamosComponent } from './custodia-reclamos.component';
import { CustodiaMatchingComponent } from './custodia-matching.component';

export type TabCustodia = 'inventario' | 'preguntas' | 'reclamos' | 'matching';

@Component({
  selector: 'app-admin-custodia',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    CustodiaInventarioComponent,
    CustodiaPreguntasComponent,
    CustodiaReclamosComponent,
    CustodiaMatchingComponent
  ],
  template: `
    <div class="itm-admin-page">
      
      <!-- Encabezado Institucional del Módulo de Custodia -->
      <div class="itm-admin-header">
        <div>
          <h1 class="itm-admin-title">Módulo de Custodia y Reclamaciones ITM</h1>
          <p class="itm-admin-subtitle">
            Inventario físico de artículos resguardados, cotejo de titularidad, legalización de entregas y Smart Matching
          </p>
        </div>

        <!-- Pestañas Principales del Módulo -->
        <div class="itm-tabs-container">
          <div class="itm-tabs">
            <button
              type="button"
              (click)="setTab('inventario')"
              class="itm-tab-btn"
              [class.active]="tabActiva() === 'inventario'">
              <mat-icon>inventory_2</mat-icon>
              <span>Inventario</span>
            </button>

            <button
              type="button"
              (click)="setTab('preguntas')"
              class="itm-tab-btn"
              [class.active]="tabActiva() === 'preguntas'">
              <mat-icon>quiz</mat-icon>
              <span>Preguntas de Seguridad</span>
            </button>

            <button
              type="button"
              (click)="setTab('reclamos')"
              class="itm-tab-btn"
              [class.active]="tabActiva() === 'reclamos'">
              <mat-icon>verified_user</mat-icon>
              <span>Reclamos y Actas</span>
            </button>

            <button
              type="button"
              (click)="setTab('matching')"
              class="itm-tab-btn"
              [class.active]="tabActiva() === 'matching'">
              <mat-icon>auto_fix_high</mat-icon>
              <span>Smart Match</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Vistas según la pestaña activa -->
      @switch (tabActiva()) {
        @case ('inventario') {
          <app-custodia-inventario
            #inventarioComp
            (gestionarPreguntas)="irAPreguntas($event)">
          </app-custodia-inventario>
        }

        @case ('preguntas') {
          <app-custodia-preguntas
            [objetoIdExterno]="objetoIdSeleccionado()">
          </app-custodia-preguntas>
        }

        @case ('reclamos') {
          <app-custodia-reclamos
            (actaGenerada)="onActaGenerada()">
          </app-custodia-reclamos>
        }

        @case ('matching') {
          <app-custodia-matching></app-custodia-matching>
        }
      }

    </div>
  `,
  styles: [`
    .itm-tabs-container {
      margin-top: 14px;
      overflow-x: auto;
      width: 100%;
    }
  `]
})
export class AdminCustodiaComponent implements OnInit {
  @ViewChild('inventarioComp') inventarioComp?: CustodiaInventarioComponent;

  tabActiva = signal<TabCustodia>('inventario');
  objetoIdSeleccionado = signal<string | null>(null);

  ngOnInit(): void {}

  setTab(tab: TabCustodia): void {
    this.tabActiva.set(tab);
  }

  irAPreguntas(objetoId: string): void {
    this.objetoIdSeleccionado.set(objetoId);
    this.tabActiva.set('preguntas');
  }

  onActaGenerada(): void {
    // Si la pestaña de inventario ya estaba inicializada, actualizamos su listado
    if (this.inventarioComp) {
      this.inventarioComp.cargarObjetos();
    }
  }
}
