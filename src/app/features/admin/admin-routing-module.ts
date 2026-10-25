
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-temporal',
  standalone: true,
  template: `
    <h1>Panel administrativo</h1>
    <p>La ruta /admin está funcionando correctamente.</p>
  `
})
class AdminTemporalComponent { }

const routes: Routes = [
  {
    path: '',
    component: AdminTemporalComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
