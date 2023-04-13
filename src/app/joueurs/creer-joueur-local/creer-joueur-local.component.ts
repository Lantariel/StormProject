import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {JoueurService} from '../../services/joueur.service';
import {Joueur} from '../../models/joueur.model';
import {AuthService} from '../../services/auth.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-creer-joueur-local',
  templateUrl: './creer-joueur-local.component.html',
  styleUrls: ['./creer-joueur-local.component.scss']
})
export class CreerJoueurLocalComponent implements OnInit {

  joueurLocalForm: FormGroup ;
  dernierJoueurCree: string ;

  joueurs: Joueur[] ;
  joueurSubscription: Subscription ;

  constructor(private formBuilder: FormBuilder,
              private authService: AuthService,
              private joueurService: JoueurService,
              private router: Router) { }

  ngOnInit(): void {

    this.joueurSubscription = this.joueurService.joueursSubject.subscribe(
      (joueurs: Joueur[]) => {
        this.joueurs = joueurs ;
        }
      );
    this.joueurService.getPlayers() ;
    this.initForm();
    this.dernierJoueurCree = '' ;
  }

  initForm(): void {

    this.joueurLocalForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      nickname: ['', Validators.required],
      lastName: ['', Validators.required]
    }) ;
  }

  onSaveJoueurLocal(): void {

    this.dernierJoueurCree = '' ;

    const date = new Date() ;
    const nowForId = date.getTime() ;
    const tempId = nowForId.toString() ;

    const firstName = this.joueurLocalForm.get('firstName').value ;
    const lastname = this.joueurLocalForm.get('lastName').value ;
    const nickname = this.joueurLocalForm.get('nickname').value ;
    const playerID = this.joueurService.joueurs.length + tempId ;
    const index = this.joueurService.joueurs.length ;

    const newJoueur = new Joueur(firstName, lastname, playerID) ;
    newJoueur.playerIndex = index ;
    newJoueur.nickname = nickname ;
    newJoueur.eloValue = 1000 ;

    this.joueurLocalForm.reset() ;

    this.joueurService.creerNouveauJoueur(newJoueur) ;
    this.dernierJoueurCree = firstName + ' ' + lastname ;
  }

  resetNotif(): void{
    this.dernierJoueurCree = '' ;
  }
}
