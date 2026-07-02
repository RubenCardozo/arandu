import { Routes } from '@angular/router';
import { InicioComponent } from './pages/inicio/inicio.component';
import { EditorialComponent } from './pages/editorial/editorial.component';
import { AnunciosComponent } from './pages/anuncios/anuncios.component';
import { BuscarComponent } from './pages/buscar/buscar';
import { RegistroComponent } from './pages/registro/registro.component';
import { SessionComponent } from './pages/session/session.component';
import { AnunciosNuevoComponent } from './pages/anuncios-nuevo/anuncios-nuevo.component';

export const routes: Routes = [
  { path: '', component: InicioComponent },
  { path: 'editorial', component: EditorialComponent },
  { path: 'anuncios', component: AnunciosComponent },
  { path: 'anuncios/nuevo', component: AnunciosNuevoComponent },
  { path: 'buscar', component: BuscarComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'session', component: SessionComponent },
  { path: '**', redirectTo: '' }
];
