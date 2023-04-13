import {Injectable} from '@angular/core';
import {Tournoi} from '../models/tournoi.model';
import {Match} from '../models/match.model';
import {Subject} from 'rxjs';
import '@firebase/auth';
import '@firebase/database';
import '@firebase/storage';
import {Joueur} from '../models/joueur.model';
import {HttpClient} from '@angular/common/http';
import {Ronde} from '../models/ronde.model';
import {Penalty} from '../models/penalty.model';
import firebase from 'firebase';

@Injectable({
  providedIn: 'root'
})

export class TournoiService {

  tournois: Tournoi[] = [] ;
  tournoisSubject = new Subject<Tournoi[]>() ;

  constructor(private httpClient: HttpClient) { }

  /* === DATABASE === */

  emitTournois(): void {
    this.tournoisSubject.next(this.tournois) ;
  }

  saveTournoi(): void {
    this.updateTournamentIds() ;
    firebase.database().ref('/tournois').set(this.tournois) ;
  }

  getTournois(): void {
    firebase.database().ref('/tournois').on('value', (data) => {
      this.tournois = data.val() ? data.val() : [] ;
      this.emitTournois() ;
    }) ;
  }

  getSingleTournoi(id: number): any {
    return new Promise(
      (resolve, reject) => {
        firebase.database().ref('/tournois/' + id).once('value').then(
          (data) => {
            resolve(data.val());
          }, (error) => {
            reject(error) ;
          }
        );
      }
    );
  }

  saveTargetTournoi(tournament: Tournoi): void{
    firebase.database().ref('/tournois/' + tournament.tournamentIndex).set(tournament) ;
  }

  deleteTargetTournoi(tournament: Tournoi): void{
    this.tournois[tournament.tournamentIndex].status = 'deleted' ;
    this.saveTournoi() ;
    this.emitTournois() ;
  }

  /* === CREATION D'UN TOURNOI */

  createNewTournoi(newTournoi: Tournoi): void {
    newTournoi.editors.push(firebase.auth().currentUser.email) ;
    newTournoi.tournamentIndex = this.tournois.length ;
    newTournoi.nombreDeRondes = 0 ;
    this.tournois.push(newTournoi) ;
    this.saveTargetTournoi(newTournoi);
    this.emitTournois();
  }

  supprimerTournoi(tournoi: Tournoi): any{
    const indexTournoiASupprimer = this.tournois.findIndex(
      (tournoiEl) => {
        if (tournoiEl === tournoi) {
          return true ;
        }
      }
    );
    this.tournois.splice(indexTournoiASupprimer, 1);
    this.saveTournoi();
    this.emitTournois();
  }

  ajouterUnJoueur(id: number, joueur: Joueur): void {
    joueur.hasByes = 0 ;
    if (this.tournois[id].registeredPlayers)
    { this.tournois[id].registeredPlayers.push(joueur) ; }
    else
    { this.tournois[id].registeredPlayers = [joueur] ; }

    this.saveTournoi() ;
    this.emitTournois() ;
  }

  retirerUnJoueur(tournoi: Tournoi, joueur: Joueur): any {

    const indexJoueurATrouver = tournoi.registeredPlayers.findIndex(
      (joueurEl: Joueur) => {
        if (joueurEl === joueur) {
          return true ;
        }
      }
    );

    this.tournois[tournoi.tournamentIndex].registeredPlayers = tournoi.registeredPlayers ;
    this.saveTournoi() ;
    this.emitTournois() ;
  }

  setRoundNumber(id: number , nb: number): void{

    this.tournois[id].nombreDeRondes = nb ;
    this.saveTournoi() ;
    this.emitTournois() ;
  }

  activateFixedRoundNumber(tournament: Tournoi): void{
    tournament.roundNumberIsFixed = true ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  desactivateFixedRoundNumber(tournoi: Tournoi, nb: number): void{
    tournoi.roundNumberIsFixed = false ;
    tournoi.nombreDeRondes = nb ;
    this.saveTargetTournoi(tournoi) ;
    this.emitTournois() ;
  }

  beginTournament(id: number): void{
    this.tournois[id].inscriptionsOuvertes = false ;
    this.tournois[id].rondeEnCours = 1 ;
    this.tournois[id].isLive = true ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < this.tournois[id].registeredPlayers.length ; i++) {
      this.tournois[id].registeredPlayers[i].gamesPlayed = 0 ;
      this.tournois[id].registeredPlayers[i].gameWins = 0 ;
      this.tournois[id].registeredPlayers[i].matchsPlayed = 0 ;
      this.tournois[id].registeredPlayers[i].matchWins = 0 ;
      this.tournois[id].registeredPlayers[i].score = 0 ;
      this.tournois[id].registeredPlayers[i].previousOpponents = [15000] ;
      this.tournois[id].registeredPlayers[i].status = 'active' ;
      this.tournois[id].registeredPlayers[i].opponentsGameWinRate = 0 ;
      this.tournois[id].registeredPlayers[i].personnalGameWinRate = 0 ;
      this.tournois[id].registeredPlayers[i].opponentsMatchWinRate = 0 ;
      this.tournois[id].registeredPlayers[i].personnalMatchWinRate = 0 ;
      this.tournois[id].registeredPlayers[i].warnings = [
        new Penalty('none', 'none', 'No penalty received', 0, 'none')] ;
      this.tournois[id].registeredPlayers[i].fixedOnTable = 'none' ;
      this.tournois[id].registeredPlayers[i].playingAt = 'none' ;
      this.tournois[id].registeredPlayers[i].loss = 0 ;
      this.tournois[id].registeredPlayers[i].draws = 0 ;
      this.tournois[id].registeredPlayers[i].hasBeenDeckchecked = false ;
      this.tournois[id].registeredPlayers[i].currentStanding = i + 1 ;
    }

    this.tournois[id].currentStanding = this.shuffleInPlace(this.tournois[id].registeredPlayers) ;

    for (let i = 0 ; i < this.tournois[id].registeredPlayers.length ; i++) {
      this.tournois[id].registeredPlayers[i].playerIndexInEvent = i ;
    }

    this.saveTournoi() ;
    this.emitTournois() ;
  }

  updateTournamentIds(): void{
    for (let i = 0 ; i < this.tournois.length ; i++) {
      this.tournois[i].tournamentIndex = i ;
    }
  }

  setTournamentTop(id: number, nb: number): void{
    this.tournois[id].tournamentCut = nb ;
    this.saveTournoi() ;
    this.emitTournois() ;
  }

  setFinalsActivation(tournament: Tournoi, activated: boolean): void{
    tournament.finalBracket = activated;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  endTournament(tournament: Tournoi): void{

  }

  lockFinalStanding(tournament: Tournoi): void{
    let tempWinner: number ;
    let tempLooser: number ;

    if (tournament.currentMatches[0].scoreJ1 > tournament.currentMatches[0].scoreJ2)
    {
      tempWinner = tournament.currentMatches[0].joueur1 ;
      tempLooser = tournament.currentMatches[0].joueur2 ;
    }
    else
    {
      tempWinner = tournament.currentMatches[0].joueur2 ;
      tempLooser = tournament.currentMatches[0].joueur1 ;
    }
    tournament.currentStanding[0] = tournament.registeredPlayers[tempWinner] ;
    tournament.currentStanding[1] = tournament.registeredPlayers[tempLooser] ;
  }

  addEditor(tournament: Tournoi, editor: string): void{
    tournament.editors.push(editor) ;
    this.saveTournoi() ;
    this.emitTournois() ;
  }

  removeEditor(tournament: Tournoi, editorId: number): void{
    if (editorId !== 0 )
    { tournament.editors.splice(editorId, 1) ; }
    else
    { console.log('owner cannot be removed') ; }

    this.saveTournoi() ;
    this.emitTournois() ;
  }

  /* == GESTION DES RONDES == */

  goToNexRound(tournament: Tournoi): void{
    const actualRoundNumber = tournament.rondeEnCours ;
    const nouvelleRonde = new Ronde(tournament.tournamentName, actualRoundNumber + 1) ;

    if (actualRoundNumber === tournament.nombreDeRondes)
    {
      tournament.step = 'finals' ;
      this.lockFinalPlayers(tournament) ;
    }

    this.addNewRound(tournament.tournamentId, nouvelleRonde) ;

    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  addNewRound(id: number, newRound: Ronde): void{
    this.tournois[id].rondes.push(newRound) ;
    this.tournois[id].rondeEnCours++ ;
    this.saveTournoi() ;
    this.emitTournois() ;
  }

  updateRegisteredPlayers(tournament: Tournoi, joueurs: Joueur[]): void{
    tournament.registeredPlayers = joueurs ;
    this.saveTournoi() ;
    this.emitTournois() ;
  }

  /* == GESTION DES MATCHS == */

  createPairingsFromStandingsRecursive(tournament: Tournoi): Tournoi{
    const matches: Match[] = [] ;
    let playersToPair: Joueur[] = [] ;
    let playerWithBye: Joueur = null ;
    let pairingResult: any ;

    // ----- définir les joueurs à pairer -----
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.currentStanding.length ; i++)
    {
      if (tournament.currentStanding[i].status === 'active')
      { playersToPair.push(tournament.currentStanding[i]) ; }
    }
    // ----- Attribution du bye si nécessaire -----

    if (playersToPair.length % 2 !== 0)
    {
      let byeGranted = false ;
      let targetBye = playersToPair.length - 1 ;

      while (!byeGranted)
      {
        if (!this.checkIfPlayerHadBye(tournament, playersToPair[targetBye].playerIndexInEvent))
        {
          playerWithBye = playersToPair[playersToPair.length - 1] ;
          playersToPair.pop() ;
          byeGranted = true ;
        }
        else { targetBye-- ; }
      }
    }

    // ----- Création des pairings -----

    if (tournament.rondeEnCours < tournament.nombreDeRondes)
    { playersToPair = this.randomizePairings(playersToPair) ; }

    pairingResult = this.toPair(playersToPair, matches) ;
    if (pairingResult)
    {
      tournament.currentMatches = pairingResult ;
      tournament.rondes[tournament.rondeEnCours - 1].firstPairingsAlreadySubmitted = true ;
      // ----- ajout du bye si il y en a un -----
      if (playerWithBye !== null)
      { tournament.currentMatches.push(new Match(playerWithBye.playerIndexInEvent, 15000)) ; }
      this.checkByes(tournament) ;
      this.setDefaultTables(tournament) ;
      this.checkFixedTables(tournament) ;

      for (const match of tournament.currentMatches)
      {
        if (match.joueur2 !== 15000)
        {
          tournament.registeredPlayers[match.joueur1].playingAt = match.table.toString() ;
          tournament.registeredPlayers[match.joueur2].playingAt = match.table.toString() ;
        }
        else { tournament.registeredPlayers[match.joueur1].playingAt = '***bye***' ; }
      }
    }
    else  { console.log('--- PAIRING IMPOSSIBLE ---') ; }

    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
    return tournament ;
  }

  toPair(tabJoueurs: Joueur[], tabMatches: Match[]): any{
    let targetPlayer = 1 ;
    let paired = false ;

    while (!paired) // tant qu'on a pas réussi à pairer le joueur
    {
      // si les joueurs ne se sont pas déjà affrontés
      if (!this.checkIfPlayersalreadyFaced(tabJoueurs[0], tabJoueurs[targetPlayer]))
      {
        tabMatches.push(new Match(tabJoueurs[0].playerIndexInEvent, tabJoueurs[targetPlayer].playerIndexInEvent)) ; // on créé le match
        tabJoueurs.splice(targetPlayer, 1) ; // on efface le joueur cible
        tabJoueurs.splice(0, 1) ; // on efface le joueur actuel
        paired = true ;
        // Si il reste des joueurs on poursuit avec les tableaux actualisés
        if (tabJoueurs.length > 0) { return this.toPair(tabJoueurs, tabMatches) ;  }
        else { return tabMatches ; } // Sinon on retourne le tableau
      }
      // si les joueurs se sont déjà affrontés on passe au joueur cible suivant si il y en a un
      else
      {
        if (targetPlayer < tabJoueurs.length - 1) // si il reste des joueurs
        { targetPlayer++ ; } // on essaye avec le suivant
        else
        {
            if (targetPlayer === tabJoueurs.length - 1) // cas dernier joueur
            {
              return false ;
            }
            else { return false ; } // le pairing n'est pas possible
        }
      }
    }
  }

  createFirstRoundPairings(tournament: Tournoi): void{
    let playerWithBye: Joueur = null ;
    const playersToPair: Joueur [] = [] ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.registeredPlayers.length ; i++)
    { playersToPair.push(tournament.registeredPlayers[i]) ; }

    if (tournament.registeredPlayers.length % 2 !== 0)
    {
      playerWithBye = playersToPair[playersToPair.length - 1] ;
      playersToPair.pop() ;
    }

    while (playersToPair.length > 0)
    {
      tournament.currentMatches.push(new Match(playersToPair[0].playerIndexInEvent, playersToPair[1].playerIndexInEvent)) ;
      playersToPair.splice(0, 2) ;
    }
    if (playerWithBye !== null) { tournament.currentMatches.push(new Match(playerWithBye.playerIndexInEvent, 15000)) ; }

    tournament.currentMatches.splice(0, 1) ;
    this.checkByes(tournament) ;
    tournament = this.setDefaultTables(tournament) ;
    tournament = this.checkFixedTables(tournament) ;
    tournament.rondes[0].firstPairingsAlreadySubmitted = true ;

    for (const match of tournament.currentMatches)
    {
      if (match.joueur2 !== 15000)
      {
        tournament.registeredPlayers[match.joueur1].playingAt = match.table.toString() ;
        tournament.registeredPlayers[match.joueur2].playingAt = match.table.toString() ;
      }
      else { tournament.registeredPlayers[match.joueur1].playingAt = '***bye***' ; }
    }

    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  setDefaultTables(tournament: Tournoi): Tournoi{
    for (let i = 0 ; i < tournament.currentMatches.length ; i++)
    {
      if (this.checkIfMatchHasaBye(tournament, i)) { tournament.currentMatches[i].table = '*** bye ***' ; }
      else { tournament.currentMatches[i].table = i + 1 ; }
    }
    return tournament ;
  }

  setPlayingAtToPlayers(tournament: Tournoi): Tournoi{

    /*let playerIndex = 0 ;
    for (let i = 0 ; i < tournament.registeredPlayers.length ; i++)
    {
      playerIndex = i ;
      for (let y = 0 ; y < tournament.currentMatches.length ; y++)
      {
        if (tournament.currentMatches[y].joueur1 === playerIndex ||
          tournament.currentMatches[y].joueur2 === playerIndex)
        {
          tournament.registeredPlayers[playerIndex].playingAt = tournament.currentMatches[y].table.toString() ;
          y = tournament.currentMatches.length ;
        }
      }
    }*/

    for (const match of tournament.currentMatches)
    {
      tournament.registeredPlayers[match.joueur1].playingAt = match.table.toString() ;
      tournament.registeredPlayers[match.joueur2].playingAt = match.table.toString() ;
    }
    return tournament ;
  }

  checkIfMatchHasaBye(tournament: Tournoi, matchId: number): boolean{
    return tournament.currentMatches[matchId].joueur1 === 15000 ||
      tournament.currentMatches[matchId].joueur2 === 15000;
  }

  grantByes(tournament: Tournoi, pArray: Joueur[]): void{
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < pArray.length ; i++)
    {
      this.createMatch(tournament, pArray[i], this.createBye()) ;
    }
  }

  createLastRoundPairings(tournament: Tournoi): void{
    const matches: Match[] = [] ;
    const playersToPair: Joueur[] = [] ;
    let playerWithBye: Joueur = null ;
    let pairingResult: any ;

    // ----- définir les joueurs à pairer -----
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.currentStanding.length ; i++)
    {
      if (tournament.currentStanding[i].status === 'active')
      { playersToPair.push(tournament.currentStanding[i]) ; }
    }

    // ----- Attribution du bye si nécessaire -----
    if (playersToPair.length % 2 !== 0)
    {
      let byeGranted = false ;
      let targetBye = playersToPair.length - 1 ;

      while (!byeGranted)
      {
        if (!this.checkIfPlayerHadBye(tournament, playersToPair[targetBye].playerIndexInEvent))
        {
          playerWithBye = playersToPair[playersToPair.length - 1] ;
          playersToPair.pop() ;
          byeGranted = true ;
        }
        else { targetBye-- ; }
      }
    }

    // ----- Création des pairings -----
    pairingResult = this.toPair(playersToPair, matches) ;

    if (pairingResult)
    {
      tournament.currentMatches = pairingResult ;
      // ----- ajout du bye si il y en a un -----
      if (playerWithBye !== null)
      {
        tournament.currentMatches.push(new Match(playerWithBye.playerIndexInEvent, 15000)) ;
        this.checkByes(tournament) ;
      }
      tournament = this.setDefaultTables(tournament) ;
      tournament = this.checkFixedTables(tournament) ;
      tournament = this.setPlayingAtToPlayers(tournament) ;
      tournament.rondes[tournament.rondeEnCours - 1].firstPairingsAlreadySubmitted = true ;
    }
    else  { console.log('--- PAIRING IMPOSSIBLE ---') ; }

    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  swapPlayersBetweenMatches(tournament: Tournoi, match1: number, match2: number): Tournoi{
    const tempPlayer = tournament.currentMatches[match1].joueur1 ;
    tournament.currentMatches[match1].joueur1 = tournament.currentMatches[match2].joueur1 ;
    tournament.currentMatches[match2].joueur1 = tempPlayer ;
    return tournament ;
  }

  swapPlayer2BetweenMatches(tournament: Tournoi, match1: number, match2: number): Tournoi{
    const tempPlayer = tournament.currentMatches[match1].joueur2 ;
    tournament.currentMatches[match1].joueur2 = tournament.currentMatches[match2].joueur2 ;
    tournament.currentMatches[match2].joueur2 = tempPlayer ;
    return tournament ;
  }

  createMatchesFromArray(tabJoueurs: Joueur[], tournament: Tournoi): void{
    const half = tabJoueurs.length / 2 ;
    const matches: Match[] = [] ;
    const maxTable = tournament.currentMatches.length ;

    for (let i = 0 ; i < tabJoueurs.length / 2 ; i++)
    { matches.push(new Match(tabJoueurs[i].playerIndexInEvent, tabJoueurs[i + half].playerIndexInEvent)) ; }

    for (let y = 0 ; y < matches.length ; y++)
    {
      matches[y].table = maxTable + y ;

      if (matches[y].joueur2 !== 15000)
      {
        tournament.registeredPlayers[matches[y].joueur1].playingAt = matches[y].table.toString() ;
        tournament.registeredPlayers[matches[y].joueur2].playingAt = matches[y].table.toString() ;
      }
      else { tournament.registeredPlayers[matches[y].joueur1].playingAt = '***bye***' ; }

      tournament.currentMatches.push(matches[y]) ;
    }
  }

  createMatch(tournament: Tournoi, j1: Joueur, j2: Joueur): void{
    tournament.currentMatches.push(new Match(j1.playerIndexInEvent, j2.playerIndexInEvent)) ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  clearMatches(tournament: Tournoi): void{
   tournament.currentMatches.splice(0, tournament.currentMatches.length) ;
   tournament.currentMatches.push(new Match(15000, 15000)) ;
   tournament.rondes[tournament.rondeEnCours - 1].firstPairingsAlreadySubmitted = false ;
   this.saveTargetTournoi(tournament) ;

  }

  createBye(): Joueur{
    return new Joueur(' bye', '', '15000') ;
  }

  checkByes(tournament: Tournoi): void{

    for (let i = 0 ; i < tournament.currentMatches.length ; i++)
    {
      if (tournament.currentMatches[i].joueur2 === 15000)
      {
        this.enterScore(tournament, i, 2, 0, false, false) ;
        tournament.currentMatches[i].scoreAlreadySubmitted = true ;
      }
    }
  }

  checkFixedTables(tournament: Tournoi): Tournoi{

    for (let i = 0 ; i < tournament.currentMatches.length ; i++)
    {
      const j1 = this.getPlayer(tournament.currentMatches[i].joueur1, tournament) ;
      const j2 = this.getPlayer(tournament.currentMatches[i].joueur2, tournament) ;

      if (tournament.currentMatches[i].joueur2 !== 15000)
      {
        if (j1.fixedOnTable !== 'none')
        {
          tournament = this.swapPlayersBetweenMatches(tournament, i, +j1.fixedOnTable - 1) ;
          tournament = this.swapPlayer2BetweenMatches(tournament, i, +j1.fixedOnTable - 1) ;
        }

        else if (j2.fixedOnTable !== 'none')
        {
          tournament = this.swapPlayersBetweenMatches(tournament, i, +j2.fixedOnTable - 1) ;
          tournament = this.swapPlayer2BetweenMatches(tournament, i, +j2.fixedOnTable - 1) ;
        }
      }
    }
    return tournament ;
  }

  setCurrentMatches(tournament: Tournoi, matches: Match[]): void{
    tournament.currentMatches = matches;
    tournament.rondes[tournament.rondeEnCours - 1].firstPairingsAlreadySubmitted = true ;
    tournament = this.setDefaultTables(tournament) ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.currentMatches.length ; i++)
    {
      if (tournament.currentMatches[i].joueur2 !== 15000)
      {
        tournament.registeredPlayers[tournament.currentMatches[i].joueur1].playingAt = tournament.currentMatches[i].table ;
        tournament.registeredPlayers[tournament.currentMatches[i].joueur2].playingAt = tournament.currentMatches[i].table ;
      }
      else { tournament.registeredPlayers[tournament.currentMatches[i].joueur1].playingAt = '***bye***' ; }
     }

    this.saveTargetTournoi(tournament) ;
    this.emitTournois();
  }

  checkIfPlayersalreadyFaced(j1: Joueur, j2: Joueur): boolean{
    let alreadyFaced = false ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < j1.previousOpponents.length ; i++)
    {
      if (j1.previousOpponents[i] === j2.playerIndexInEvent)
      { alreadyFaced = true ; }
    }
    return alreadyFaced ;
  }

  createFinalMatches(tournament: Tournoi): void{
    const players: Joueur[] = [] ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.currentStanding.length ; i++)
    {
      if (tournament.currentStanding[i].status === 'active')
      { players.push(tournament.currentStanding[i]) ; }
    }

    const half = players.length / 2 - 1 ;
    const matches: Match[] = [];

    for (let i = 0 ; i <= half ; i++)
    {
      matches.push(new Match(players[i].playerIndexInEvent, players[players.length - 1 - i].playerIndexInEvent)) ;
      matches[i].table = i + 1 ;
    }

    tournament.currentMatches = matches ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  nextFinalStep(tournament: Tournoi): void{
    const tempWinners: Joueur[] = [] ;
    let tempLoosers: Joueur[] = [] ;
    const tempMatches: Match[] = [] ;
    const tempTop: Joueur[] = [] ;

    // lock des résultats
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.currentMatches.length ; i++)
    {
      const idJ1 = tournament.currentMatches[i].joueur1 ;
      const idJ2 = tournament.currentMatches[i].joueur2 ;
      const totalGames = tournament.currentMatches[i].scoreJ1 + tournament.currentMatches[i].scoreJ2 ;

      tournament.registeredPlayers[idJ1].matchsPlayed++ ;
      tournament.registeredPlayers[idJ2].matchsPlayed++ ;
      tournament.registeredPlayers[idJ1].gamesPlayed += totalGames ;
      tournament.registeredPlayers[idJ2].gamesPlayed += totalGames ;
      tournament.registeredPlayers[idJ1].gameWins += tournament.currentMatches[i].scoreJ1 ;
      tournament.registeredPlayers[idJ2].gameWins += tournament.currentMatches[i].scoreJ2 ;
      tournament.registeredPlayers[idJ1].previousOpponents.push(idJ2) ;
      tournament.registeredPlayers[idJ2].previousOpponents.push(idJ1) ;

      if (tournament.currentMatches[i].scoreJ1 > tournament.currentMatches[i].scoreJ2)
      {
        tournament.registeredPlayers[idJ2].status = 'dropped' ;
        tournament.registeredPlayers[idJ1].matchWins++ ;
        tempWinners.push(tournament.registeredPlayers[idJ1]) ;
        tempLoosers.push(tournament.registeredPlayers[idJ2]) ;
      }
      else
      {
        tournament.registeredPlayers[idJ1].status = 'dropped' ;
        tournament.registeredPlayers[idJ2].matchWins++ ;
        tempWinners.push(tournament.registeredPlayers[idJ2]) ;
        tempLoosers.push(tournament.registeredPlayers[idJ1]) ;
      }
    }

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.currentMatches.length ; i++)
    { tournament.rondes[tournament.rondeEnCours - 1].matches.push(tournament.currentMatches[i]) ; }
    tournament.rondes[tournament.rondeEnCours - 1].matches.splice(0, 1) ;
    this.clearMatches(tournament) ;

    // Passage à la phase suivante
    const actualRoundNumber = tournament.rondeEnCours ;
    const nouvelleRonde = new Ronde(tournament.tournamentName, actualRoundNumber + 1) ;
    this.addNewRound(tournament.tournamentId, nouvelleRonde) ;

    for (let i = 0 ; i < tempWinners.length ; i++)
    {
      tempMatches.push(new Match(tempWinners[i].playerIndexInEvent, tempWinners[i + 1].playerIndexInEvent)) ;
      i++ ;
    }

    // tslint:disable-next-line:only-arrow-functions
    tempLoosers = tempLoosers.sort(function(a, b): any{
      return a.opponentsGameWinRate - b.opponentsGameWinRate ;
    }) ;

    // tslint:disable-next-line:only-arrow-functions
    tempLoosers = tempLoosers.sort(function(a, b): any{
      return a.personnalGameWinRate - b.personnalGameWinRate ;
    }) ;

    // tslint:disable-next-line:only-arrow-functions
    tempLoosers = tempLoosers.sort(function(a, b): any{
      return a.opponentsMatchWinRate - b.opponentsMatchWinRate ;
    }) ;

    // tslint:disable-next-line:only-arrow-functions
    tempLoosers = tempLoosers.sort(function(a, b): any{
      return a.score - b.score ;
    }) ;

    tournament.currentMatches = tempMatches ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tempWinners.length ; i++)
    { tempTop.push(tempWinners[i]) ; }

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tempLoosers.length ; i++)
    { tempTop.push(tempLoosers[i]) ; }

    for (let i = 0 ; i < tempTop.length ; i++)
    { tournament.currentStanding[i] = tempTop[i] ; }

    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  checkAvailableMatchSwap(tournament: Tournoi, actualMatchId: number, secondMatchID: number): any{
    let playersToSwap: number ;
    let returnSwap = false ;

    const j11 = this.getPlayer(tournament.currentMatches[actualMatchId].joueur1, tournament) ;
    const j21 = this.getPlayer(tournament.currentMatches[actualMatchId].joueur2, tournament) ;
    const j12 = this.getPlayer(tournament.currentMatches[secondMatchID].joueur1, tournament) ;
    const j22 = this.getPlayer(tournament.currentMatches[secondMatchID].joueur2, tournament) ;

    if (!this.checkIfPlayersalreadyFaced(j11, j12) && (!this.checkIfPlayersalreadyFaced(j21, j22)))
     { playersToSwap = 1 ; returnSwap = true ; }

    // tslint:disable-next-line:max-line-length
     else if (!this.checkIfPlayersalreadyFaced(j11, j22) && (!this.checkIfPlayersalreadyFaced(j21, j12)))
     { playersToSwap = 2 ; returnSwap = true ; }

    if (returnSwap) { return playersToSwap ; }
   else { return false ; }
  }

  checkIfAPlayerIsalreadyAssignedToTable(tournament: Tournoi, tableNumber: number): boolean{
    let alreadyTaken = false ;
    for (let i = 0 ; i < tournament.registeredPlayers.length ; i++)
    {
      if (+tournament.registeredPlayers[i].fixedOnTable === tableNumber)
      {
        alreadyTaken = true ;
        i = tournament.registeredPlayers.length ;
      }
    }
    return alreadyTaken ;
  }

  setAdditionalTime(tournament: Tournoi, matchId: number, timeValue: number): void{
    tournament.currentMatches[matchId].additionalTime += timeValue ;

    if (tournament.currentMatches[matchId].additionalTime < 0) { tournament.currentMatches[matchId].additionalTime = 0 ; }

    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  randomizePairings(playersToPair: Joueur[]): Joueur[]{
    const result: Joueur[] = [] ;
    playersToPair = this.shuffleInPlace(playersToPair) ;
    // tslint:disable-next-line:only-arrow-functions
    playersToPair = playersToPair.sort(function(a, b): any{
      return a.score - b.score ;
    }) ;

    for (let i = playersToPair.length - 1 ; i >= 0 ; i--)
    { result.push(playersToPair[i]) ; }

    return result ;
  }

  /* == GESTION DES SCORES == */

  enterScore(tournament: Tournoi, matchId: number, score1: number, score2: number, drop1: boolean, drop2: boolean): void{

    tournament.currentMatches[matchId].scoreJ1 = score1 ;
    tournament.currentMatches[matchId].scoreJ2 = score2 ;

    if (tournament.currentMatches[matchId].scoreAlreadySubmitted === false)
    { tournament.currentMatches[matchId].scoreAlreadySubmitted = true ; }

    tournament.currentMatches[matchId].dropj1 = drop1;
    tournament.currentMatches[matchId].dropj2 = drop2;

    // this.saveTournoi() ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  lockMatchResults(tournament: Tournoi): Tournoi{

    let idJ1: number ;
    let idJ2: number ;
    let score1: number ;
    let score2: number ;
    let totalGames: number ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.currentMatches.length ; i++)
    {
      idJ1 = tournament.currentMatches[i].joueur1 ;
      idJ2 = tournament.currentMatches[i].joueur2 ;
      score1 = tournament.currentMatches[i].scoreJ1 ;
      score2 = tournament.currentMatches[i].scoreJ2 ;
      totalGames = score1 + score2 ;

      // === VICTOIRE JOUEUR 2 ===
      if (tournament.currentMatches[i].scoreJ1 < tournament.currentMatches[i].scoreJ2)
      {
        // Victoires
        tournament.registeredPlayers[idJ2].score += 3 ;
        tournament.registeredPlayers[idJ2].matchWins++ ;
        tournament.registeredPlayers[idJ1].loss++ ;

        // Parties gagnées
        tournament.registeredPlayers[idJ2].gameWins += score2 ;
        tournament.registeredPlayers[idJ1].gameWins += score1 ;

        // Parties et matchs joués
        tournament.registeredPlayers[idJ1].gamesPlayed += totalGames ;
        tournament.registeredPlayers[idJ1].matchsPlayed++ ;

        tournament.registeredPlayers[idJ2].gamesPlayed += totalGames ;
        tournament.registeredPlayers[idJ2].matchsPlayed++ ;

        // update des adversaires précédents
        tournament.registeredPlayers[idJ1].previousOpponents.push(tournament.registeredPlayers[idJ2].playerIndexInEvent) ;
        tournament.registeredPlayers[idJ2].previousOpponents.push(tournament.registeredPlayers[idJ1].playerIndexInEvent) ;

        if (tournament.rondeEnCours === 1)
        {
          tournament.registeredPlayers[idJ1].previousOpponents.splice(0, 1) ;
          tournament.registeredPlayers[idJ2].previousOpponents.splice(0, 1) ;
        }
      }

      // === VICTOIRE JOUEUR 1 ===
      if (tournament.currentMatches[i].scoreJ1 > tournament.currentMatches[i].scoreJ2)
      {
        // Victoires
        tournament.registeredPlayers[idJ1].matchWins++ ;
        tournament.registeredPlayers[idJ1].score += 3 ;

        // Parties gagnées
        tournament.registeredPlayers[idJ1].gameWins += score1 ;

        // Parties et matchés joués
        tournament.registeredPlayers[idJ1].gamesPlayed += totalGames ;
        tournament.registeredPlayers[idJ1].matchsPlayed++ ;

        if (tournament.currentMatches[i].joueur2 !== 15000) // Si j2 n'est pas un bye
        {
          tournament.registeredPlayers[idJ2].gameWins += score2 ; // Parties gagnées
          tournament.registeredPlayers[idJ2].gamesPlayed += totalGames ; // Parties jouées
          tournament.registeredPlayers[idJ2].matchsPlayed++ ; // Matchs joués
          tournament.registeredPlayers[idJ2].loss++ ; // défaites
          tournament.registeredPlayers[idJ2].previousOpponents.push(
            tournament.registeredPlayers[idJ1].playerIndexInEvent) ;
          tournament.registeredPlayers[idJ1].previousOpponents.push(
            tournament.registeredPlayers[idJ2].playerIndexInEvent) ;

          if (tournament.rondeEnCours === 1)
          {
            tournament.registeredPlayers[idJ1].previousOpponents.splice(0, 1) ;
            tournament.registeredPlayers[idJ2].previousOpponents.splice(0, 1) ;
          }
        }
        else
        {
          tournament.registeredPlayers[idJ1].previousOpponents.push(15000) ;
          if (tournament.rondeEnCours === 1)
          { tournament.registeredPlayers[idJ1].previousOpponents.splice(0, 1) ; }
        }
      }

      // === DRAW ===
      if (tournament.currentMatches[i].scoreJ1 === tournament.currentMatches[i].scoreJ2)
      {
        // Victoires
        tournament.registeredPlayers[idJ1].draws++ ;
        tournament.registeredPlayers[idJ2].draws++ ;

        // update des scores
        tournament.registeredPlayers[idJ1].score += 1 ;
        tournament.registeredPlayers[idJ2].score += 1 ;

        // update des parties gagnées
        tournament.registeredPlayers[idJ1].gameWins += score1 ;
        tournament.registeredPlayers[idJ2].gameWins += score2 ;

        // update des parties jouées
        tournament.registeredPlayers[idJ1].gamesPlayed += totalGames ;
        tournament.registeredPlayers[idJ2].gamesPlayed += totalGames ;
        tournament.registeredPlayers[idJ1].matchsPlayed++ ;
        tournament.registeredPlayers[idJ2].matchsPlayed++ ;

        tournament.registeredPlayers[idJ1].previousOpponents.push(tournament.registeredPlayers[idJ2].playerIndexInEvent) ;
        tournament.registeredPlayers[idJ2].previousOpponents.push(tournament.registeredPlayers[idJ1].playerIndexInEvent) ;

        if (tournament.rondeEnCours === 1)
        {
          tournament.registeredPlayers[idJ1].previousOpponents.splice(0, 1) ;
          tournament.registeredPlayers[idJ2].previousOpponents.splice(0, 1) ;
        }
      }
      if (tournament.currentMatches[i].dropj1 === true) { tournament.registeredPlayers[idJ1].status = 'dropped' ; }
      if (tournament.currentMatches[i].dropj2 === true) { tournament.registeredPlayers[idJ2].status = 'dropped' ; }
    }

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.registeredPlayers.length ; i++)
    {
      if (tournament.registeredPlayers[i].status !== 'active')
      {
        tournament.registeredPlayers[i].matchsPlayed++ ;
        tournament.registeredPlayers[i].gamesPlayed += 2 ;
        tournament.registeredPlayers[i].previousOpponents.push(15000) ;
      }
    }

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.currentMatches.length ; i++)
    { tournament.rondes[tournament.rondeEnCours - 1].matches.push(tournament.currentMatches[i]) ; }
    tournament.rondes[tournament.rondeEnCours - 1].matches.splice(0, 1) ;
    this.clearMatches(tournament) ;
    return tournament ;
  }

  updateWinRates(tournament: Tournoi): Tournoi{
    let totalGamesPlayed: number ;
    let totalGamesWon: number ;
    let totalMatchPlayed: number ;
    let totalMatchWon: number ;
    let targetId: number ;
    let matchratio: number ;
    let oppopersoratio: number ;

    tournament = this.updatePersonnalWinrates(tournament) ;
    // calcul des winrate des adversaires
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.registeredPlayers.length ; i++)
    {
      totalGamesPlayed = 0 ;
      totalGamesWon = 0 ;
      matchratio = 0 ;
      oppopersoratio = 0 ;
      /*
      totalMatchPlayed = 0 ;
      totalMatchWon = 0 ;*/

      // tslint:disable-next-line:prefer-for-of
      for (let y = 0; y < tournament.registeredPlayers[i].previousOpponents.length ; y++)
      {
        targetId = tournament.registeredPlayers[i].previousOpponents[y] ;

        if (targetId !== 15000) // Si n'est pas un bye
        {
          totalGamesPlayed += tournament.registeredPlayers[targetId].gamesPlayed ;
          totalGamesWon += tournament.registeredPlayers[targetId].gameWins ;
          oppopersoratio = tournament.registeredPlayers[targetId].matchWins /
            tournament.registeredPlayers[targetId].matchsPlayed ;
          if (oppopersoratio > 1 / 3)
          {
            matchratio += tournament.registeredPlayers[targetId].matchWins /
              tournament.registeredPlayers[targetId].matchsPlayed ;

          }
          else { matchratio += (1 / 3) ; }
          /*
          totalMatchPlayed += tournament.registeredPlayers[targetId].matchsPlayed ;
          totalMatchWon += tournament.registeredPlayers[targetId].matchWins ;*/
        }
        else // Si target ID est un bye
        {
          if (tournament.rondeEnCours === 1)
          {
            totalGamesPlayed = 2 ;
            totalMatchPlayed = 1 ;
          }
          else
          {
            totalGamesPlayed += tournament.rondes.length * 2 ;
            totalGamesWon += tournament.rondes.length * 2 - 2 ;
            totalMatchPlayed += tournament.rondes.length ;
            totalMatchWon += tournament.rondes.length - 1 ;
          }
        }

        tournament.registeredPlayers[i].opponentsGameWinRate = totalGamesWon / totalGamesPlayed ;
        tournament.registeredPlayers[i].opponentsMatchWinRate = matchratio / tournament.rondeEnCours ;
      }
    }
    return tournament ;
  }

  calculerClassement(tournament: Tournoi): Tournoi{

    const rondeActuelle = tournament.rondeEnCours ;
    let joueursAClasser: Joueur[] = [];

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.registeredPlayers.length ; i++)
    { joueursAClasser.push(tournament.registeredPlayers[i]) ; }

    // tslint:disable-next-line:only-arrow-functions
    joueursAClasser = joueursAClasser.sort(function(a, b): any{
      return a.opponentsGameWinRate - b.opponentsGameWinRate ;
    }) ;

    // tslint:disable-next-line:only-arrow-functions
    joueursAClasser = joueursAClasser.sort(function(a, b): any{
      return a.personnalGameWinRate - b.personnalGameWinRate ;
    }) ;

    // tslint:disable-next-line:only-arrow-functions
    joueursAClasser = joueursAClasser.sort(function(a, b): any{
      return a.opponentsMatchWinRate - b.opponentsMatchWinRate ;
    }) ;

    // tslint:disable-next-line:only-arrow-functions
    joueursAClasser = joueursAClasser.sort(function(a, b): any{
      return a.score - b.score ;
    }) ;

    for (let i = joueursAClasser.length - 1 ; i >= 0 ; i--)
    {
      joueursAClasser[i].currentStanding = i + 1 ;
      tournament.rondes[rondeActuelle - 1].finalStandings.push(joueursAClasser[i]) ;
    }

    tournament.rondes[rondeActuelle - 1].finalStandings.splice(0, 1) ;
    tournament.currentStanding = tournament.rondes[rondeActuelle - 1].finalStandings ;

    for (let i = 0 ; i < tournament.currentStanding.length ; i++)
    { tournament.registeredPlayers[tournament.currentStanding[i].playerIndexInEvent].currentStanding = i + 1 ; }

    return tournament ;
  }

  updateStandingFromScratch(tournament: Tournoi): void{
    tournament = this.updatePlayerStatsFromScratch(tournament) ;

    let joueursAClasser: Joueur[] = [] ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.registeredPlayers.length ; i++)
    { joueursAClasser.push(tournament.registeredPlayers[i]) ; }

    // tslint:disable-next-line:only-arrow-functions
    joueursAClasser = joueursAClasser.sort(function(a, b): any{
      return a.opponentsGameWinRate - b.opponentsGameWinRate ;
    }) ;

    // tslint:disable-next-line:only-arrow-functions
    joueursAClasser = joueursAClasser.sort(function(a, b): any{
      return a.personnalGameWinRate - b.personnalGameWinRate ;
    }) ;

    // tslint:disable-next-line:only-arrow-functions
    joueursAClasser = joueursAClasser.sort(function(a, b): any{
      return a.opponentsMatchWinRate - b.opponentsMatchWinRate ;
    }) ;

    // tslint:disable-next-line:only-arrow-functions
    joueursAClasser = joueursAClasser.sort(function(a, b): any{
      return a.score - b.score ;
    }) ;

    tournament.currentStanding.splice(0, tournament.currentStanding.length) ;
    for (let i = joueursAClasser.length - 1 ; i >= 0 ; i--)
    { tournament.currentStanding.push(joueursAClasser[i]) ; }

    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  updatePlayerStatsFromScratch(tournament: Tournoi): any{
    const players: Joueur[] = [];

    for (let i = 0 ; i < tournament.registeredPlayers.length ; i++)
    {
      players.push(tournament.registeredPlayers[i]) ;
      players[i].gamesPlayed = 0 ;
      players[i].score = 0 ;
      players[i].opponentsGameWinRate = 0 ;
      players[i].opponentsMatchWinRate = 0 ;
      players[i].personnalGameWinRate = 0 ;
      players[i].gameWins = 0 ;
      players[i].matchWins = 0 ;
      players[i].matchsPlayed = 0 ;
    }

    for (let i = 0 ; i < tournament.rondes.length - 1 ; i++)
    {
      // tslint:disable-next-line:prefer-for-of
      for (let y = 0 ; y < tournament.rondes[i].matches.length ; y++)
      {
        if (tournament.rondes[i].matches[y].scoreJ2 > tournament.rondes[i].matches[y].scoreJ1)
        {
          const idj1 = tournament.rondes[i].matches[y].joueur1 ;
          const idj2 = tournament.rondes[i].matches[y].joueur2 ;
          const totalGamesPlayed = tournament.rondes[i].matches[y].scoreJ1 + tournament.rondes[i].matches[y].scoreJ2 ;

          players[idj2].matchWins++ ;
          players[idj1].matchsPlayed++ ;
          players[idj2].matchsPlayed++ ;
          players[idj2].score += 3 ;
          players[idj2].gameWins += tournament.rondes[i].matches[y].scoreJ2 ;
          players[idj1].gameWins += tournament.rondes[i].matches[y].scoreJ1 ;
          players[idj1].gamesPlayed += totalGamesPlayed ;
          players[idj2].gamesPlayed += totalGamesPlayed ;
        }
        else if (tournament.rondes[i].matches[y].scoreJ2 < tournament.rondes[i].matches[y].scoreJ1)
        {
          const idj1 = tournament.rondes[i].matches[y].joueur1 ;
          const totalGamesPlayed = tournament.rondes[i].matches[y].scoreJ1 + tournament.rondes[i].matches[y].scoreJ2 ;

          players[idj1].matchWins++ ;
          players[idj1].matchsPlayed++ ;
          players[idj1].score += 3 ;
          players[idj1].gameWins += tournament.rondes[i].matches[y].scoreJ1 ;
          players[idj1].gamesPlayed += totalGamesPlayed ;

          if (tournament.rondes[i].matches[y].joueur2 !== 15000)
          {
            const idj2 = tournament.rondes[i].matches[y].joueur2 ;
            players[idj2].gameWins += tournament.rondes[i].matches[y].scoreJ2 ;
            players[idj2].gamesPlayed += totalGamesPlayed ;
            players[idj2].matchsPlayed++ ;
          }
        }
        else if (tournament.rondes[i].matches[y].scoreJ2 === tournament.rondes[i].matches[y].scoreJ1)
        {
          const idj1 = tournament.rondes[i].matches[y].joueur1 ;
          const idj2 = tournament.rondes[i].matches[y].joueur2 ;
          const totalGamesPlayed = tournament.rondes[i].matches[y].scoreJ1 + tournament.rondes[i].matches[y].scoreJ2 ;

          players[idj1].score += 1 ;
          players[idj2].score += 1 ;
          players[idj1].matchsPlayed++ ;
          players[idj2].matchsPlayed++ ;
          players[idj2].gameWins += tournament.rondes[i].matches[y].scoreJ2 ;
          players[idj1].gameWins += tournament.rondes[i].matches[y].scoreJ1 ;
          players[idj1].gamesPlayed += totalGamesPlayed ;
          players[idj2].gamesPlayed += totalGamesPlayed ;
        }
      }
    }

    tournament.registeredPlayers.splice(0, tournament.registeredPlayers.length) ;
    tournament.registeredPlayers = players ;
    this.updateWinRates(tournament) ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  updatePersonnalWinrates(tournament: Tournoi): Tournoi{
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.registeredPlayers.length ; i++)
    {
      tournament.registeredPlayers[i].personnalGameWinRate = tournament.registeredPlayers[i].gameWins /
        tournament.registeredPlayers[i].gamesPlayed  ;
      tournament.registeredPlayers[i].personnalMatchWinRate = tournament.registeredPlayers[i].matchWins /
        tournament.registeredPlayers[i].matchsPlayed  ;
    }
    return tournament ;
  }

  getPlayerIdInArray(pId: string, pArray: Joueur[]): number{
    let id = 0 ;

    for (let i = 0 ; i < pArray.length ; i++)
    {
      if (pArray[i].playerID === pId)
      {
        id = i ;
        i = pArray.length ;
      }
    }
    return id ;
  }

  modifyPreviousScore(tournament: Tournoi, prevRounds: Ronde[]): void{
    for (let i = 0 ; i < prevRounds.length ; i++)
    { tournament.rondes[i] = prevRounds[i] ; }

    tournament = this.updatePlayerStatsFromScratch(tournament) ;
    console.log(tournament) ;
    this.saveTargetTournoi(tournament) ;
  }

  /* === GESTION DES JOUEURS === */

  dropPlayer(tournament: Tournoi, playerId: number): void {
    tournament.registeredPlayers[playerId].status = 'dropped' ;
    tournament.currentStanding[this.findPlayerInStandings(
      tournament, tournament.registeredPlayers[playerId].playerIndexInEvent)].status = 'dropped' ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  rehabPlayer(tournament: Tournoi, playerId: number): void {
    tournament.registeredPlayers[playerId].status = 'active' ;
    tournament.currentStanding[this.findPlayerInStandings(
      tournament, tournament.registeredPlayers[playerId].playerIndexInEvent)].status = 'active' ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  setFixedTable(tournament: Tournoi, playerId: number, table: string): void{
    const id = playerId ;

    tournament.registeredPlayers[id].fixedOnTable = table ;
    tournament.currentStanding[this.findPlayerInStandings(
      tournament, tournament.registeredPlayers[id].playerIndexInEvent)].fixedOnTable = table ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  removeFixedTable(tournament: Tournoi, pId: number): void{
    tournament.registeredPlayers[pId].fixedOnTable = 'none' ;
    tournament.currentStanding[this.findPlayerInStandings(
      tournament, tournament.registeredPlayers[pId].playerIndexInEvent)].fixedOnTable = 'none' ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  lockFinalPlayers(tournament: Tournoi): void{
    for (let i = 0 ; i <  tournament.currentStanding.length ; i++)
    {
      if (i >= tournament.tournamentCut)
      { tournament.currentStanding[i].status = 'dropped' ; }
    }
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  checkIfPlayerHadBye(tournament: Tournoi, pId: number): boolean{
    let hadBye = false ;
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournament.registeredPlayers[pId].previousOpponents.length ; i++)
    {
      if (tournament.registeredPlayers[pId].previousOpponents[i] === 15000)
      { hadBye = true ; }
    }
    return hadBye ;
  }

  grantBye(tournament: Tournoi, pId: number): void{
    tournament.registeredPlayers[pId].hasByes++ ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  reduceBye(tournament: Tournoi, pId: number): void{
    if (tournament.registeredPlayers[pId].hasByes > 0) { tournament.registeredPlayers[pId].hasByes-- ; }
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  setDecklist(tournament: Tournoi, pId: number, decklist: string): void{
    tournament.registeredPlayers[pId].decklist = decklist ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  setCommander(tournament: Tournoi, pId: number, commander: string, url: any, origin: number): void{
    tournament.registeredPlayers[pId].commander = commander ;
    if (origin !== 0)
    { this.updateStandingFromScratch(tournament) ; }

    else
    {
      this.saveTargetTournoi(tournament) ;
      this.emitTournois() ;
    }
  }

  setCommanderImg(tournament: Tournoi, pId: number, commander: string, url: any, origin: number): void{
    tournament.registeredPlayers[pId].commanderImgUrl = url.toString() ;
    if (origin !== 0)
    { this.updateStandingFromScratch(tournament) ; }

    else
    {
      this.saveTargetTournoi(tournament) ;
      this.emitTournois() ;
    }
  }

  setPartner(tournament: Tournoi, pId: number, partner: string, url: any, origin: number): void{
    tournament.registeredPlayers[pId].partner = partner ;
    tournament.registeredPlayers[pId].partnerImgUrl = url.toString() ;

    if (origin !== 0)
    { this.updateStandingFromScratch(tournament) ; }
    else
    {
      this.saveTargetTournoi(tournament) ;
      this.emitTournois() ;
    }
  }

  setPartnerImg(tournament: Tournoi, pId: number, commander: string, url: any, origin: number): void{
    tournament.registeredPlayers[pId].partnerImgUrl = url.toString() ;
    if (tournament.registeredPlayers[pId].commander.localeCompare(tournament.registeredPlayers[pId].partner) > 0)
    { tournament = this.sortCommanders(tournament, pId) ; }
    if (origin !== 0)
    { this.updateStandingFromScratch(tournament) ; }
    else
    {
      this.saveTargetTournoi(tournament) ;
      this.emitTournois() ;
    }
  }

  sortCommanders(tournament: Tournoi, pId: number): Tournoi{
    // swap généraux
    const tempCmd: string = tournament.registeredPlayers[pId].commander ;
    tournament.registeredPlayers[pId].commander = tournament.registeredPlayers[pId].partner ;
    tournament.registeredPlayers[pId].partner = tempCmd ;

    // swap
    const tempUrl = tournament.registeredPlayers[pId].commanderImgUrl ;
    tournament.registeredPlayers[pId].commanderImgUrl = tournament.registeredPlayers[pId].partnerImgUrl ;
    tournament.registeredPlayers[pId].partnerImgUrl = tempUrl ;

    return tournament ;
  }

  sortCommanderAndPartner(joueur: Joueur): Joueur{
    if (joueur.commander.localeCompare(joueur.partner) > 0)
    { console.log('oui') ;
      const tempCmd = joueur.commander ;
      const tempImgUrl = joueur.commanderImgUrl ;
      joueur.commander = joueur.partner ;
      joueur.commanderImgUrl = joueur.partnerImgUrl ;

      joueur.partner = tempCmd ;
      joueur.partnerImgUrl = tempImgUrl ;
    }
    return joueur ;
  }

  resetCommander(tournament: Tournoi, pId: number): void{
    tournament.registeredPlayers[pId].commander = 'x' ;
    tournament.registeredPlayers[pId].commanderImgUrl = 'x' ;
    tournament.registeredPlayers[pId].partner = '' ;
    tournament.registeredPlayers[pId].partnerImgUrl = null ;

    tournament.currentStanding[this.findPlayerInStandings(
      tournament, tournament.registeredPlayers[pId].playerIndexInEvent)].commander = 'x' ;
    tournament.currentStanding[this.findPlayerInStandings(
      tournament, tournament.registeredPlayers[pId].playerIndexInEvent)].commanderImgUrl = 'x' ;
    tournament.currentStanding[this.findPlayerInStandings(
      tournament, tournament.registeredPlayers[pId].playerIndexInEvent)].partner = '' ;
    tournament.currentStanding[this.findPlayerInStandings(
      tournament, tournament.registeredPlayers[pId].playerIndexInEvent)].partnerImgUrl = null ;

    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  resetPartner(tournament: Tournoi, pId: number): void{
    tournament.registeredPlayers[pId].partner = '' ;
    tournament.registeredPlayers[pId].partnerImgUrl = null ;

    tournament.currentStanding[this.findPlayerInStandings(
      tournament, tournament.registeredPlayers[pId].playerIndexInEvent)].partner = '' ;
    tournament.currentStanding[this.findPlayerInStandings(
      tournament, tournament.registeredPlayers[pId].playerIndexInEvent)].partnerImgUrl = null ;

    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  setDeckCheckStatus(tournament: Tournoi, pIds: number[], deckcheck: boolean): void{
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < pIds.length ; i++)
    { tournament.registeredPlayers[pIds[i]].hasBeenDeckchecked = deckcheck ; }

    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  addPlayerDuringEvent(tournament: Tournoi, player: Joueur, loss: number, byes: number): void{
    const tempPlayer = new Joueur(player.firstName, player.lastName, player.playerID) ;

    tempPlayer.loss = loss ;
    tempPlayer.gameWins = 0 ;
    tempPlayer.matchWins = byes ;
    tempPlayer.draws = 0 ;
    tempPlayer.score = byes * 3 ;
    tempPlayer.opponentsGameWinRate = 0 ;
    tempPlayer.opponentsMatchWinRate = 0 ;
    tempPlayer.personnalGameWinRate = 0 ;
    tempPlayer.personnalMatchWinRate = 0 ;
    tempPlayer.playerIndexInEvent = tournament.registeredPlayers.length - 1 ;
    tempPlayer.status = 'active' ;
    tempPlayer.warnings = [new Penalty('none', 'none', 'No penalty received', 0, 'none')] ;
    tempPlayer.fixedOnTable = 'none' ;
    tempPlayer.playingAt = 'none' ;
    tempPlayer.hasBeenDeckchecked = false ;

    tempPlayer.matchsPlayed = tournament.rondes.length - 1 ;
    tempPlayer.gamesPlayed = tournament.rondes.length - 1 ;

    if (tournament.rondeEnCours === 1)
    {
      tempPlayer.previousOpponents = [15000] ;
    }
    else
    {
      for (let i = 0 ; i < tournament.rondes.length - 1 ; i++)
      {
        tempPlayer.previousOpponents.push(15000) ;
        tournament.rondes[i].matches.push(new Match(tempPlayer.playerIndexInEvent, 15000)) ;
        tournament.rondes[i].matches[tournament.rondes[i].matches.length - 1].table = '*** bye ***' ;
      }
    }

    tournament.registeredPlayers.push(tempPlayer) ;
    tournament.currentStanding.push(tempPlayer) ;
    tournament.currentMatches.push(new Match(tempPlayer.playerIndexInEvent, 15000)) ;
    tournament.currentMatches[tournament.currentMatches.length - 1].table = '*** bye ***' ;
    this.checkByes(tournament) ;
    tournament = this.setPlayingAtToPlayers(tournament) ;
    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  updateTargetPlayerEverywhere(joueur: Joueur, tournoi: Tournoi): Tournoi{
    tournoi.currentStanding[joueur.currentStanding - 1] = joueur ;
    tournoi.registeredPlayers[joueur.playerIndexInEvent] = joueur ;
    return tournoi ;
  }

  /* == GESTION DES PENALITES == */

  addPenalty(tournament: Tournoi, choice: number, pType: string, pSanction: string, pDesc: string, roundNumber: number,
             judge: string, matchID: number): void{
    const penalty = new Penalty(pType, pSanction, pDesc, roundNumber, judge) ;
    let playerID = 0 ;

    if (choice === 1)
    {
      playerID = tournament.currentMatches[matchID].joueur1 ;
      tournament.currentStanding[this.findPlayerInStandings(
        tournament, tournament.currentMatches[matchID].joueur2)].warnings.push(penalty) ;
    }
    else
    {
      playerID = tournament.currentMatches[matchID].joueur2 ;
      tournament.currentStanding[this.findPlayerInStandings(
        tournament, tournament.currentMatches[matchID].joueur2)].warnings.push(penalty) ;
    }

    tournament.registeredPlayers[playerID].warnings.push(penalty) ;

    if (tournament.registeredPlayers[playerID].warnings[0].penaltyType === 'none')
    { tournament.registeredPlayers[playerID].warnings.splice(0, 1) ; }

    this.saveTargetTournoi(tournament) ;
    this.emitTournois() ;
  }

  /* == UTILITAIRES == */

  getRandom(floor: number, ceiling: number): number {
    return Math.floor(Math.random() * (ceiling - floor + 1)) + floor;
  }

  shuffleInPlace(array: any[]): any[] {
    let temp: Joueur ;
    // if it's 1 or 0 items, just return
    if (array.length <= 1) { return array; }

    // For each index in array
    for (let i = 0 ; i < array.length; i++)
    {
      // choose a random not-yet-placed item to place there
      // must be an item AFTER the current item, because the stuff
      // before has all already been placed
      const randomChoiceIndex = this.getRandom(i, array.length - 1);

      // place our random choice in the spot by swapping
      temp = array[i] ;
      array[i] = array[randomChoiceIndex] ;
      array[randomChoiceIndex] = temp ;
    }
    return array;
  }

  findPlayerInStandings(tournament: Tournoi, pId: number): number{

    let idToGet: number ;
    for (let i = 0 ; i < tournament.currentStanding.length ; i++)
    {
      if (tournament.currentStanding[i].playerIndexInEvent === pId)
      {
        idToGet = i ;
        i = tournament.currentStanding.length ;
      }
    }
    return idToGet ;
  }

  listeDesJoueursParOrdreAlphabetique(tournament: Tournoi): any{

    // tslint:disable-next-line:only-arrow-functions
    return tournament.registeredPlayers.sort(function(a, b): any {
      if (a.lastName < b.lastName) {
        return -1 ;
      }
      if (a.lastName > b.lastName) {
        return 1;
      }
      return 0 ;
    }) ;

    /*joueursAClasser = joueursAClasser.sort(function(a, b){
      return a.opponentsGameWinRate - b.opponentsGameWinRate ;
    }) ;*/
  }

  updatePlayerName(joueur: Joueur): any{
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < this.tournois.length ; i++)
    {
      // tslint:disable-next-line:prefer-for-of
      for (let y = 0 ; y < this.tournois[i].registeredPlayers.length ; y++)
      {
        if (this.tournois[i].registeredPlayers[y].playerID === joueur.playerID)
        {
          this.tournois[i].registeredPlayers[y].firstName = joueur.firstName ;
          this.tournois[i].registeredPlayers[y].lastName = joueur.lastName ;
          this.tournois[i].registeredPlayers[y].nickname = joueur.nickname ;

          if (this.tournois[i].isLive)
          {
            const pId = this.findPlayerInStandings(this.tournois[i], joueur.playerIndexInEvent) ;
            this.tournois[i].currentStanding[pId].firstName = joueur.firstName ;
            this.tournois[i].currentStanding[pId].lastName = joueur.lastName ;
            this.tournois[i].currentStanding[pId].nickname = joueur.nickname ;
          }
        }
      }
    }
    this.saveTournoi() ;
    this.emitTournois() ;
  }

  getTableToDeckCheck(tournament: Tournoi): number{
    let matchSet: Match[] = [];

    for (let i = 0 ; i < tournament.currentMatches.length / 2 ; i++)
    {
      const j1: Joueur = this.getPlayer(tournament.currentMatches[i].joueur1, tournament) ;
      const j2: Joueur = this.getPlayer(tournament.currentMatches[i].joueur2, tournament) ;

      if (j1.hasBeenDeckchecked === false && j2.hasBeenDeckchecked === false)
      { matchSet.push(tournament.currentMatches[i]) ; }
    }
    matchSet = this.shuffleInPlace(matchSet) ;
    return matchSet[0].table ;
  }

  getPlayer(pId: number, tournoi: Tournoi): Joueur{
    return tournoi.registeredPlayers[pId] ;
  }
}
