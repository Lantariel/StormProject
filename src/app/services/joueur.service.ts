import { Injectable } from '@angular/core';
import {Joueur} from '../models/joueur.model';
import {Subject} from 'rxjs';
import { firebase } from '@firebase/app';
import '@firebase/auth' ;
import '@firebase/database';
import '@firebase/storage' ;

@Injectable({
  providedIn: 'root'
})

export class JoueurService {

  joueurs: Joueur[] = [] ;
  joueursSubject = new Subject<Joueur[]>() ;

  constructor() { }

  emitPlayers(): void {
    this.joueursSubject.next(this.joueurs) ;
  }

  sauvegarderJoueurs(): void {
    firebase.database().ref('/joueurs').set(this.joueurs) ;
  }

  getPlayers(): void {
    firebase.database().ref('/joueurs').on('value', (data) => {
      this.joueurs = data.val() ? data.val() : [] ;
      this.emitPlayers() ;
    });
  }

  getPlayersFromTournament(id: number): void {
      firebase.database().ref('/tournois/' + id + 'registeredPlayers').on('value', (data) => {
      this.joueurs = data.val() ? data.val() : [] ;
      this.emitPlayers() ;
    });
  }

  getSinglePlayer(id: number): Promise<Joueur> {
    return new Promise(
      (resolve, reject) => {
        firebase.database().ref('/joueurs/' + id).once('value').then(
          (data) => {
            resolve(data.val());
          }, (error) => {
            reject(error) ;
          }
        );
      }
    );
  }

  saveTargetPlayer(player: Joueur): void{
    firebase.database().ref('/joueurs/' + player.playerIndex).set(player) ;
  }

  creerNouveauJoueur(newJoueur: Joueur): void {
    this.joueurs.push(newJoueur) ;
    firebase.database().ref('/joueurs/' + newJoueur.playerIndex).set(newJoueur) ;
    this.getPlayers() ;
    this.emitPlayers() ;
  }

  supprimerJoueur(joueur: Joueur): any {
    const indexJoueurASupprimer = this.joueurs.findIndex(
      (joueurEl) => {
      if (joueurEl === joueur) {
        return true ;
       }
      }
    );

    this.joueurs.splice(indexJoueurASupprimer, 1) ;
    this.sauvegarderJoueurs() ;
    this.emitPlayers() ;
  }

  editPlayer(player: Joueur): void{
    const pId = this.getPlayerIndex(player.playerID) ;
    this.joueurs[pId] = player ;
    this.saveTargetPlayer(player) ;
    this.emitPlayers() ;
  }

  getPlayerIndex(pId: string): number{
    let id = 0 ;
    for (let i = 0 ; i < this.joueurs.length ; i++)
    {
      if (this.joueurs[i].playerID === pId)
      {
        id = i ;
        i = this.joueurs.length ;
      }
    }
    return id ;
  }
}
