import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {TournoiService} from '../../services/tournoi.service';
import {Form, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Tournoi} from '../../models/tournoi.model';
import {Joueur} from '../../models/joueur.model';
import {Match} from '../../models/match.model';
import {AuthService} from '../../services/auth.service';
import firebase from 'firebase';

@Component({
  selector: 'app-switchpairings',
  templateUrl: './switchpairings.component.html',
  styleUrls: ['./switchpairings.component.scss']
})
export class SwitchpairingsComponent implements OnInit {

  tournoi: Tournoi; // Le tournoi sur lequel on travaille
  currentTournamentIndex: number; // Index dans la base du tournoi en cours

  formSearchForTable: FormGroup ;
  tableInput: FormGroup ;

  playerstoPair: Joueur[] ;
  droppedPlayers: Joueur[] ;
  selectedPlayer1: Joueur ;
  selectedPlayer2: Joueur ;

  started: boolean ;

  constructor(private route: ActivatedRoute,
              private authService: AuthService,
              private tournoiService: TournoiService,
              private formBuilder: FormBuilder,
              private router: Router) { }

  ngOnInit(): void {

    this.tournoi = new Tournoi('', '', +'') ;
    this.currentTournamentIndex = this.route.snapshot.params.id;

    this.tournoiService.getTournois();
    this.tournoiService.emitTournois();

    this.tournoiService.getSingleTournoi(this.currentTournamentIndex).then(
      (tournoi: Tournoi) => {
        this.tournoi = tournoi ;

        if (!this.tournoiService.isAuthor(this.tournoi, firebase.auth().currentUser.email))
        { this.router.navigate(['listetournois']) ; }
        else {
          this.droppedPlayers = this.getDroppedPlayers() ;
          this.started = this.roundStarted() ;
        }
      }) ;

    this.initForm() ;
    this.playerstoPair = [] ;
    this.selectedPlayer1 = null ;
    this.selectedPlayer2 = null ;
  }

  onBackToRound(): void{
    if (this.tournoi.step === 'rounds')
    { this.router.navigate(['gererronde', this.currentTournamentIndex]); }
    else
    { this.router.navigate(['finalmatches', this.currentTournamentIndex]); }
  }

  onMakePairingsManyaly(): void{
    this.getPlayersToPair() ;
    this.tournoi.currentMatches.splice(0, 1) ;
  }

  initForm(): void{
    this.formSearchForTable = this.formBuilder.group({
      research: ['', Validators.required]
    }) ;

    this.tableInput = this.formBuilder.group({
      tableNumber: ['', Validators.required]
    }) ;
  }

  matchResearch(table: number): any{

    const t = table + 1 ;
    const research = this.formSearchForTable.get('research').value ;

    if (research === '')
    { return true ; }

    else
    {
      if (t === +research)
      { return true ; }

      else
      {
        const j1 = this.tournoiService.getPlayer(this.tournoi.currentMatches[table].joueur1, this.tournoi) ;
        const j2 = this.tournoiService.getPlayer(this.tournoi.currentMatches[table].joueur2, this.tournoi) ;

        return j1.firstName.toLowerCase().search(research.toLowerCase()) !== -1
          || j1.lastName.toLowerCase().search(research.toLowerCase()) !== -1
          || j2.firstName.toLowerCase().search(research.toLowerCase()) !== -1
          || j2.lastName.toLowerCase().search(research.toLowerCase()) !== -1;
      }
    }
  }

  checkIfTableIsAlreadyTaken(): boolean{
    let alreadyTaken = false ;
    const tNumber = this.tableInput.get('tableNumber').value ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < this.tournoi.currentMatches.length ; i++)
    {
      if (this.tournoi.currentMatches[i].table === tNumber)
      { alreadyTaken = true ; }
    }
    return alreadyTaken ;
  }

  selectPlayer(toPairId: number): void{

    if (this.selectedPlayer1 === null)
    {
      this.selectedPlayer1 = this.playerstoPair[toPairId] ;
      this.playerstoPair.splice(toPairId, 1) ;
    }
    else
    {
      if (this.playerstoPair[toPairId].playerID !== this.selectedPlayer1.playerID && !this.selectedPlayer2)
      {
        this.selectedPlayer2 = this.playerstoPair[toPairId] ;
        this.playerstoPair.splice(toPairId, 1) ;
        this.tableInput.controls.tableNumber.setValue(this.getFirstAvalaibleTable()) ;
      }
    }
  }

  giveBye(): void{
    this.selectedPlayer2 = new Joueur('bye', '***', '15000') ;
    this.tableInput.controls.tableNumber.setValue(this.getMaxTable() + 1) ;
  }

  cancelMatchCreation(): void{

    if (this.selectedPlayer1 !== null)
    { this.playerstoPair.push(this.selectedPlayer1) ; }

    if (this.selectedPlayer2 !== null && this.selectedPlayer2.playerID !== '15000')
    { this.playerstoPair.push(this.selectedPlayer2) ; }

    this.selectedPlayer1 = null ;
    this.selectedPlayer2 = null ;

    this.tableInput.reset() ;
  }

  matchIsComplete(): boolean{
    return this.selectedPlayer1 !== null && this.selectedPlayer2 !== null;
  }

  checkIfPlayersAlreadyFaced(j1: Joueur, j2: Joueur): boolean{
    let alreadyFaced = false ;

    if (j1 !== null && j2 !== null)
    {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0 ; i < j1.previousOpponents.length ; i++)
      {
        if (j1.previousOpponents[i] !== 15000)
        {
          if (j1.previousOpponents[i] === j2.playerIndexInEvent)
          { alreadyFaced = true ; }
        }
      }
    }
    return alreadyFaced ;
  }

  createMatch(): void{
    const newMatch = new Match(this.selectedPlayer1.playerIndexInEvent, this.selectedPlayer2.playerIndexInEvent) ;
    let table = this.tableInput.get('tableNumber').value ;

    if (table < 1)
    { table = this.getFirstAvalaibleTable() ; }

    newMatch.table = table ;
    if (newMatch.joueur2 === 15000)
    {
      newMatch.scoreAlreadySubmitted = true ;
      newMatch.scoreJ1 = 2 ;
      newMatch.scoreJ2 = 0 ;
    }
    this.tournoi.currentMatches.splice(newMatch.table - 1, 0, newMatch) ;
    this.selectedPlayer1 = null ;
    this.selectedPlayer2 = null ;
    this.tableInput.reset() ;
  }

  removeMatch(matchId: number, j1: Joueur, j2: Joueur): void{
    this.tournoi.currentMatches.splice(matchId, 1) ;
    this.playerstoPair.push(j1) ;
    if (j2.playerID !== '15000')
    { this.playerstoPair.push(j2) ; }
  }

  validateMatches(): void{
  this.tournoiService.setCurrentMatches(this.tournoi, this.tournoi.currentMatches) ;
  this.tournoi.rondes[this.tournoi.rondeEnCours - 1].firstPairingsAlreadySubmitted = true ;
  this.onBackToRound() ;
  }

  getMaxTable(): number{
    let max = 0 ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < this.tournoi.currentMatches.length ; i++)
    {
      if (this.tournoi.currentMatches[i].table > max)
      { max = this.tournoi.currentMatches[i].table ; }
    }
    return max ;
  }

  getFirstAvalaibleTable(): number{
    let table: number ;

    if (this.tournoi.currentMatches.length > 0)
    {
      if (this.tournoi.currentMatches[0].table === 2) { table = 1 ; }
      else
      {
        for (let i = 0 ; i < this.tournoi.currentMatches.length - 1 ; i++)
        {
          if (this.tournoi.currentMatches[i].table + 1 !== this.tournoi.currentMatches[i + 1].table)
          {
            table =  this.tournoi.currentMatches[i].table + 1 ;
            i = this.tournoi.currentMatches.length ;
          }
          else if (i === this.tournoi.currentMatches.length - 2)
          { table = this.getMaxTable() + 1 ; }
        }
      }
    }
    else { table = 1 ; }

    return table ;
  }

  onResetMatches(): void{
    this.tournoiService.clearMatches(this.tournoi) ;
    this.onBackToRound() ;
  }

  getDroppedPlayers(): Joueur[]{
    const dropped: Joueur[] = [] ;
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < this.tournoi.registeredPlayers.length ; i++)
    {
      if (this.tournoi.registeredPlayers[i].status === 'dropped')
      { dropped.push(this.tournoi.registeredPlayers[i]) ; }
    }

    return dropped ;
  }

  getPlayersToPair(): void{
    if (this.tournoi.rondes[this.tournoi.rondeEnCours - 1].firstPairingsAlreadySubmitted === false)
    {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0 ; i < this.tournoi.currentStanding.length ; i++)
      {
        if (this.tournoi.currentStanding[i].status === 'active')
        { this.playerstoPair.push(this.tournoi.currentStanding[i]) ; }
      }
    }
  }

  roundStarted(): any{
    return this.tournoi.rondes[this.tournoi.rondeEnCours - 1].firstPairingsAlreadySubmitted ;
  }

  pairingPossible(joueur: Joueur): boolean{
    let possible = true ;

    if (this.selectedPlayer1 !== null)
    {
      if (this.checkIfPlayersAlreadyFaced(this.selectedPlayer1, joueur))
      { possible = false ; }
    }

    return possible ;
  }

  getPlayer(pId: number): Joueur{
    if (pId !== 15000) { return this.tournoiService.getPlayer(pId, this.tournoi) ; }
    else { return this.tournoiService.createBye() ; }
  }
}
