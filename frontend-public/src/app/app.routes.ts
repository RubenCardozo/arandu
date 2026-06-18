import { Routes } from '@angular/router';
import { InicioComponent } from './pages/inicio/inicio.component';
import { EditorialComponent } from './pages/editorial/editorial.component';
import { AnunciosComponent } from './pages/anuncios/anuncios.component';
import { RegistroComponent } from './pages/registro/registro.component';

export const routes: Routes = [
  { path: '', component: InicioComponent },
  { path: 'editorial', component: EditorialComponent },
  { path: 'anuncios', component: AnunciosComponent },
  { path: 'registro', component: RegistroComponent },
  { path: '**', redirectTo: '' }
];
