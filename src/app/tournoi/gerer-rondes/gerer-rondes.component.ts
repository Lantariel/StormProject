import {Component, OnDestroy, OnInit} from '@angular/core';
import {Tournoi} from '../../models/tournoi.model';
import {async, Subscription} from 'rxjs';
import {Joueur} from '../../models/joueur.model';
import {ActivatedRoute, Router} from '@angular/router';
import {TournoiService} from '../../services/tournoi.service';
import {JoueurService} from '../../services/joueur.service';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Ronde} from '../../models/ronde.model';
import {MatchService} from '../../services/match.service';
import {RondeService} from '../../services/ronde.service';
import {Match} from '../../models/match.model';
import {Penalty} from '../../models/penalty.model';
import {AuthService} from '../../services/auth.service';
import firebase from 'firebase';

@Component({
  selector: 'app-gerer-rondes',
  templateUrl: './gerer-rondes.component.html',
  styleUrls: ['./gerer-rondes.component.scss']
})

export class GererRondesComponent implements OnInit, OnDestroy {

  tournoi: Tournoi; // Le tournoi sur lequel on travaille
  currentTournamentIndex: number; // Index dans la base du tournoi en cours

  /* === Récuperation des données des joueurs et des tournois === */

  formScores: FormGroup;
  formPenalty: FormGroup ;
  formSearchForTable: FormGroup ;
  formAdditionalTime: FormGroup ;
  formDeckCheck: FormGroup ;

  tableFocus: number;
  matchFocus: Match ;
  displayFinishedMatches: boolean;
  displayPenaltyForm: boolean ;
  displayCreateMatchesButton: boolean ;
  displayDeckCheckOptions: boolean ;
  decklistj1: string ;
  decklistj2: string ;
  joueur1Decklist: string ;
  joueur2Decklist: string ;

  j1TableFocus: Joueur ;
  j2TableFocus: Joueur ;

  rondeActuelle: Ronde ;
  roundNumber: number ;
  matchsEnCours: Match[] ;

  constructor(private route: ActivatedRoute,
              private tournoiService: TournoiService,
              private authService: AuthService,
              private rondeService: RondeService,
              private formBuilder: FormBuilder,
              private router: Router) {
  }

  ngOnInit(): void {

    this.tournoi = new Tournoi('', '', +'') ;
    this.currentTournamentIndex = this.route.snapshot.params.id;
    this.displayCreateMatchesButton = true ;

    this.tournoiService.getTournois();

    this.tournoiService.getSingleTournoi(this.currentTournamentIndex).then(
      (tournoi: Tournoi) => {
        this.tournoi = tournoi ;

        if (!this.tournoiService.isAuthor(this.tournoi, firebase.auth().currentUser.email))
        { this.router.navigate(['listetournois']) ; }

        else
        {
          this.roundNumber = this.tournoi.rondeEnCours ;
          this.rondeActuelle = this.tournoi.rondes[this.roundNumber - 1] ;
          this.matchsEnCours = this.tournoi.currentMatches ;

          if (this.rondeActuelle.firstPairingsAlreadySubmitted === true)
          {
            this.displayCreateMatchesButton = false ;
          }
        }
      }) ;
    this.tournoiService.emitTournois();

    this.tableFocus = 0 ;
    this.displayFinishedMatches = false ;
    this.displayPenaltyForm = false ;
    this.displayDeckCheckOptions = false ;
    this.decklistj1 = '' ;
    this.decklistj2 = '' ;
    this.joueur1Decklist = '' ;
    this.joueur2Decklist = '' ;
    this.matchFocus = null ;

    this.initForm();
  }

  initForm(): void {
    this.formScores = this.formBuilder.group({
      scorej1: ['', Validators.required],
      scorej2: ['', Validators.required],
      dropj1: [false],
      dropj2: [false]
    });

    this.formPenalty = this.formBuilder.group({
      player: ['', Validators.required],
      type: ['', Validators.required],
      sanction: ['', Validators.required],
      desc: ['', Validators.required],
      judge: ['', Validators.required]
    }) ;

    this.formSearchForTable = this.formBuilder.group({
      research: ['', Validators.required]
    }) ;

    this.formAdditionalTime = this.formBuilder.group({
      timevalue: [0, Validators.required]
    }) ;

    this.formDeckCheck = this.formBuilder.group({
      tableToCheck: ['', Validators.required]
    }) ;
  }

  /* === GESTION DES RONDES === */

  onNextRound(): void {
    this.tournoi.rondes.push(new Ronde(this.tournoi.tournamentName, this.tournoi.rondeEnCours + 1)) ;
    this.tournoi = this.tournoiService.lockMatchResults(this.tournoi) ;
    this.tournoi = this.tournoiService.updateWinRates(this.tournoi) ;
    this.tournoi = this.tournoiService.calculerClassement(this.tournoi) ;
    this.tournoiService.goToNexRound(this.tournoi) ;

    if (this.roundNumber === this.tournoi.nombreDeRondes)
    {
      this.tournoi.step = 'finals' ;
      this.router.navigate(['finalmatches', this.currentTournamentIndex]) ;
    }

    else
    {
      this.roundNumber++ ;
      this.tournoi.rondeEnCours++ ;
      this.tableFocus = 0 ;
      this.matchsEnCours = this.tournoiService.tournois[this.currentTournamentIndex].currentMatches ;
    }
  }

  onTogleDeckcheck(): void{
    this.displayDeckCheckOptions = this.displayDeckCheckOptions !== true;
  }

  onGetDeckCheckAtRandom(): void{
    this.formDeckCheck.get('tableToCheck').setValue(this.tournoiService.getTableToDeckCheck(this.tournoi)) ;
  }

  onDeckCheckSpecificTable(): void{
    const matchId = this.formDeckCheck.get('tableToCheck').value - 1 ;
    const idJ1 = this.tournoi.currentMatches[matchId].joueur1 ;
    const idJ2 = this.tournoi.currentMatches[matchId].joueur2 ;
    this.decklistj1 = this.tournoi.registeredPlayers[idJ1].decklist ;
    this.decklistj2 = this.tournoi.registeredPlayers[idJ2].decklist ;

    if (this.decklistj1)
    { this.joueur1Decklist = 'decklist de ' + this.tournoi.registeredPlayers[idJ1].firstName + ' '
      + this.tournoi.registeredPlayers[idJ1].lastName ; }

    if (this.decklistj2)
    { this.joueur2Decklist = 'decklist de ' + this.tournoi.registeredPlayers[idJ2].firstName + ' '
      + this.tournoi.registeredPlayers[idJ2].lastName ; }

    this.tournoiService.setDeckCheckStatus(this.tournoi, [idJ1, idJ2], true) ;
    this.formDeckCheck.reset() ;
  }

  /*  === GESTION DES MATCHS === */

  setFocusTable(match: Match): void {

    this.tableFocus = match.table ;
    this.matchFocus = match ;
    if (match.scoreAlreadySubmitted === true)
    {
      this.formScores.get('scorej1').setValue(match.scoreJ1) ;
      this.formScores.get('scorej2').setValue(match.scoreJ2) ;
    }
    else { this.formScores.reset() ; }

    this.j1TableFocus = this.getPlayer(match.joueur1) ;

    if (match.joueur2 !== 15000) { this.j2TableFocus = this.getPlayer(match.joueur2) ; }
    else { (this.j2TableFocus = new Joueur('*** Bye ***', '', '15000')) ; }
  }

  player1Dropped(match: Match): any{
    return match.dropj1 ;
  }

  player2Dropped(match: Match): any{
    return match.dropj2 ;
  }

  onCreateMatches(): void{

   if (this.tournoi.rondeEnCours === this.tournoi.nombreDeRondes)
   { this.tournoiService.createLastRoundPairings(this.tournoi) ; }

   else if (this.tournoi.rondeEnCours === 1) {  this.tournoiService.createFirstRoundPairings(this.tournoi) ; }
   else { this.tournoi = this.tournoiService.createPairingsFromStandingsRecursive(this.tournoi) ; }

   this.matchsEnCours = this.tournoiService.tournois[this.currentTournamentIndex].currentMatches ;
   this.displayCreateMatchesButton = false ;
   this.tournoi.rondes[this.tournoi.rondeEnCours - 1].firstPairingsAlreadySubmitted = true ;
  }

  onSearchTable(): void{

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
        const joueur1 = this.tournoiService.getPlayer(this.tournoi.currentMatches[table].joueur1, this.tournoi);
        const joueur2 = this.tournoiService.getPlayer(this.tournoi.currentMatches[table].joueur2, this.tournoi);

        return joueur1.firstName.toLowerCase().search(research.toLowerCase()) !== -1
          || joueur1.lastName.toLowerCase().search(research.toLowerCase()) !== -1
          || joueur2.firstName.toLowerCase().search(research.toLowerCase()) !== -1
          || joueur2.lastName.toLowerCase().search(research.toLowerCase()) !== -1
          || joueur1.nickname.toLowerCase().search(research.toLowerCase()) !== -1
          || joueur2.nickname.toLowerCase().search(research.toLowerCase()) !== -1 ;
      }
    }
  }

  onSetAdditionalTime(id: number): void{
    const timevalue = this.formAdditionalTime.get('timevalue').value ;
    this.matchsEnCours[id].additionalTime += timevalue ;

    if (this.matchsEnCours[id].additionalTime < 0) { this.matchsEnCours[id].additionalTime = 0 ; }

    this.tournoiService.setAdditionalTime(this.tournoi, id, timevalue) ;
    this.formAdditionalTime.get('timevalue').setValue(0) ;
  }

  hasAdditionalTime(matchId: number): boolean{
    let hastime = false ;

    if (this.tournoi.currentMatches[matchId].additionalTime > 0)
    { hastime = true ; }

    return hastime ;
  }

  /* === GESTION DES SCORES === */

  checkAllMatchesAreOver(): boolean{
    let allFinished = true ;

    for (let i = 0 ; i < this.matchsEnCours?.length ; i++)
    {
      if (this.matchsEnCours[i].scoreAlreadySubmitted === false)
      {
        allFinished = false ;
        i = this.matchsEnCours.length ;
      }
    }
    return allFinished ;
}

  checkMatchesAlreadyCreated(): boolean{
      let alreadyCreated = false ;

      if (this.tournoi?.rondes[this.tournoi.rondeEnCours - 1]?.firstPairingsAlreadySubmitted === true)
      { alreadyCreated = true ; }

      return alreadyCreated ;
    }

  onSetScore(matchID: number): void{
    let score1 = this.formScores.get('scorej1').value ;
    let score2 = this.formScores.get('scorej2').value ;
    const dropj1 = this.formScores.get('dropj1').value ;
    const dropj2 = this.formScores.get('dropj2').value ;

    if (score1)
    {
      if (score1 < 0)
      { score1 = 0 ; }
    }
    else
    { score1 = 0 ; }

    if (score2)
    {
      if (score2 < 0)
      { score2 = 0 ; }
    }
    else
    { score2 = 0 ; }

    this.matchsEnCours[matchID].scoreJ1 = score1 ;
    this.matchsEnCours[matchID].scoreJ2 = score2 ;
    this.matchsEnCours[matchID].scoreAlreadySubmitted = true ;
    this.matchsEnCours[matchID].dropj1 = dropj1 ;
    this.matchsEnCours[matchID].dropj2 = dropj2 ;

    this.tournoiService.enterScore(this.tournoi, matchID, score1, score2, dropj1, dropj2) ;
    this.formScores.reset() ;
    this.tableFocus++ ;
}

  /* === GESTION DES PENALITES === */

  onSetPenalty(): void{
    const choice = this.formPenalty.get('player').value ;
    const pType = this.formPenalty.get('type').value ;
    const pDesc = this.formPenalty.get('desc').value ;
    const sanction = this.formPenalty.get('sanction').value ;
    const judge = this.formPenalty.get('judge').value ;

    this.formPenalty.reset() ;

    if (this.displayPenaltyForm === true)
    { this.displayPenaltyForm = false ; }

    this.tournoiService.addPenalty(
      this.tournoi, +choice, pType, sanction, pDesc, this.tournoi.rondeEnCours, judge, this.tableFocus - 1) ;

  }

  /* === NAVIGATION === */

  onOpenJoueurs(): void{
    this.router.navigate(['gererjoueurs', this.currentTournamentIndex]);
  }

  onSwitchPairings(): void{
    this.router.navigate(['switchpairings', this.currentTournamentIndex]);
  }

  onOpenDisplayInfos(): void{
    this.router.navigate(['afficherinfos', this.currentTournamentIndex]);
  }

  onPreviousRounds(): void{
    this.router.navigate(['previousrounds', this.currentTournamentIndex]);
  }

  onDisplayMetagame(): void{
    this.router.navigate(['displaymetagame', this.currentTournamentIndex]) ;
  }

  /* === ===  */

  toogleDisplayMatches(): any {
    this.displayFinishedMatches = this.displayFinishedMatches !== true;
  }

  toogleDisplayPenaltyPannel(): any{
    this.displayPenaltyForm = this.displayPenaltyForm !== true;
  }

  compareValues(val1: number, val2: number): any {
    if (val1 > val2) {
      return true;
    }
    if (val1 < val2) {
      return false;
    }
    if (val1 === val2) {
      return 0;
    }
  }

  compareScore(a: Joueur, b: Joueur): any {
    return a.score - b.score;
  }

  getRandom(floor: number, ceiling: number): any {
    return Math.floor(Math.random() * (ceiling - floor + 1)) + floor;
  }

  playersHasPartner(joueur: Joueur): boolean{
    return joueur.partner !== null;
  }

  getPlayer(pId: number): Joueur{
    if (pId !== 15000) { return this.tournoiService.getPlayer(pId, this.tournoi) ; }
    else { return this.tournoiService.createBye() ; }
  }

  ngOnDestroy(): void {

  }
}

