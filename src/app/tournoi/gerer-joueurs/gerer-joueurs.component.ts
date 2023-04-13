import { Component, OnInit } from '@angular/core';
import {Tournoi} from '../../models/tournoi.model';
import {ActivatedRoute, Route, Router} from '@angular/router';
import {TournoiService} from '../../services/tournoi.service';
import {Joueur} from '../../models/joueur.model';
import {Form, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Match} from '../../models/match.model';
import {AuthService} from '../../services/auth.service';
import {HttpClient} from '@angular/common/http';
import {browser} from 'protractor';
import {JoueurService} from '../../services/joueur.service';
import {search} from 'scryfall-client/dist/api-routes/cards';

@Component({
  selector: 'app-gerer-joueurs',
  templateUrl: './gerer-joueurs.component.html',
  styleUrls: ['./gerer-joueurs.component.scss']
})

export class GererJoueursComponent implements OnInit {

  tournoi: Tournoi; // Le tournoi sur lequel on travaille
  currentTournamentIndex: number; // Index dans la base du tournoi en cours

  joueursDuTournoi: Joueur[] ;
  playerFocus: number ;

  chercherJoueur: FormGroup ;
  assignToTable: FormGroup ;
  formDecklist: FormGroup ;
  formCommander: FormGroup ;
  formPartner: FormGroup ;
  formAddPlayer: FormGroup ;

  infoMsg: string ;
  errorMsg ;
  displayInfoMsg: boolean ;
  displayErrorMsg: boolean ;
  displayToPlayers: boolean ;
  displayCommanderImg: boolean ;
  dislpayAddPlayerPannel: boolean ;

  timeout: any = null ;
  commanderAutocomplete: any[] ;
  partnerAutocomplete: any[] ;
  searchResult: any ;
  urlResult: any ;
  searchPlayerResult: Joueur[] ;

  constructor(private route: ActivatedRoute,
              private tournoiService: TournoiService,
              private joueurService: JoueurService,
              private formBuilder: FormBuilder,
              private authService: AuthService,
              private http: HttpClient,
              private router: Router) {
  }

  ngOnInit(): void {

    this.tournoi = new Tournoi('', '', +'') ;
    this.currentTournamentIndex = this.route.snapshot.params.id;

    this.tournoiService.getTournois();
    this.tournoiService.emitTournois();

    this.joueurService.getPlayers() ;
    this.joueurService.emitPlayers() ;

    this.tournoiService.getSingleTournoi(this.currentTournamentIndex).then(
      (tournoi: Tournoi) => {
        this.tournoi = tournoi ;
        this.joueursDuTournoi = this.tournoi.currentStanding ;
      }) ;

    this.playerFocus = -1 ;
    this.displayInfoMsg = false ;
    this.displayErrorMsg = false ;
    this.displayToPlayers = true ;
    this.displayCommanderImg = true ;
    this.dislpayAddPlayerPannel = false ;

    this.commanderAutocomplete = [] ;
    this.partnerAutocomplete = [] ;
    this.searchPlayerResult = [] ;

    this.initForm() ;
  }

  initForm(): void{
    this.chercherJoueur = this.formBuilder.group({
      search: ['', Validators.required]
    }) ;

    this.assignToTable = this.formBuilder.group({
      table: ['', Validators.required]
    }) ;

    this.formDecklist = this.formBuilder.group({
      decklist: ['', Validators.required]
    }) ;

    this.formCommander = this.formBuilder.group({
      commander: ['', Validators.required]
    }) ;

    this.formPartner = this.formBuilder.group({
      partner: ['', Validators.required]
    }) ;

    this.formAddPlayer = this.formBuilder.group({
      playerid: ['', Validators.required]
    }) ;
  }

  onBackToRound(): void{
    if (this.tournoi.step === 'rounds')
    { this.router.navigate(['gererronde', this.currentTournamentIndex]); }
    else
    { this.router.navigate(['finalmatches', this.currentTournamentIndex]); }
  }

  matchResearch(id: number): any{

    const research = this.chercherJoueur.get('search').value ;

    if (research === '')
    { return true ; }

    else
    {
     return this.joueursDuTournoi[id].firstName.toLowerCase().search(research) !== -1
       || this.joueursDuTournoi[id].lastName.toLowerCase().search(research) !== -1 ;
    }
  }

  setFocusPlayer(id: number): void{
    this.playerFocus = id ;
    this.infoMsg = null ;
  }

  getRealPenalties(pId: number): number{
    let warnings = 0 ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < this.joueursDuTournoi[pId].warnings.length ; i++)
    {
      if (this.joueursDuTournoi[pId].warnings[i].penaltyType !== 'none')
      { warnings++ ; }
    }
    return warnings ;
  }

  getHistory(pFocus: number): string[]{
    const idInEvent = this.findPlayerInEvent(pFocus) ;
    const foundMatches: Match[] = [];
    const result: string[] = [] ;
    let playingAt: number ;

    for (let i = 0 ; i < this.tournoi.rondes.length - 1; i++)
    {
      // tslint:disable-next-line:prefer-for-of
      for (let y = 0 ; y < this.tournoi.rondes[i].matches.length ; y++)
      {
        if (this.tournoi.rondes[i].matches[y].joueur1 === idInEvent ||
          this.tournoi.rondes[i].matches[y].joueur2 === idInEvent)
        { foundMatches.push(this.tournoi.rondes[i].matches[y]) ; }
      }
    }

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < foundMatches.length ; i++)
    { let opponent: Joueur ;
      if (foundMatches[i].joueur1 === idInEvent)
      { playingAt = 1 ; opponent = this.getPlayer(foundMatches[i].joueur2) ; }
      else
      { playingAt = 2 ; opponent = this.getPlayer(foundMatches[i].joueur1) ; }

      if (playingAt === 1 && foundMatches[i].scoreJ1 > foundMatches[i].scoreJ2)
      {
        if (foundMatches[i].joueur2 !== 15000)
        {
          result.push('Victoire ' + foundMatches[i].scoreJ1 + ' - ' + foundMatches[i].scoreJ2 + ' contre ' +
            opponent.firstName + ' ' + opponent.lastName);
        }
        else { result.push('*** bye ***') ; }
      }

      else if (playingAt === 2 && foundMatches[i].scoreJ2 > foundMatches[i].scoreJ1)
      { result.push('Victoire ' + foundMatches[i].scoreJ2 + ' - ' + foundMatches[i].scoreJ1 + ' contre ' +
        opponent.firstName + ' ' + opponent.lastName); }

      else if (playingAt === 1 && foundMatches[i].scoreJ2 > foundMatches[i].scoreJ1)
      { result.push('Défaite ' + foundMatches[i].scoreJ1 + ' - ' + foundMatches[i].scoreJ2 + ' contre ' +
        opponent.firstName + ' ' + opponent.lastName); }

      else if (playingAt === 2 && foundMatches[i].scoreJ2 < foundMatches[i].scoreJ1)
      { result.push('Défaite ' + foundMatches[i].scoreJ2 + ' - ' + foundMatches[i].scoreJ1 + ' contre ' +
        opponent.firstName + ' ' + opponent.lastName); }

      else if (playingAt === 1 && foundMatches[i].scoreJ2 === foundMatches[i].scoreJ1)
      { result.push('Egalité ' + foundMatches[i].scoreJ1 + ' - ' + foundMatches[i].scoreJ2 + ' contre ' +
        opponent.firstName + ' ' + opponent.lastName); }

      else if (playingAt === 2 && foundMatches[i].scoreJ2 === foundMatches[i].scoreJ1)
      { result.push('Egalité ' + foundMatches[i].scoreJ2 + ' - ' + foundMatches[i].scoreJ1 + ' contre ' +
        opponent.firstName + ' ' + opponent.lastName); }
    }
    return result ;
  }

  findPlayerInEvent(pFocus: number): number{
    let idInEvent: number ;
    for (let i = 0 ; i < this.tournoi.registeredPlayers.length ; i++)
    {
      if (this.tournoi.registeredPlayers[i].playerID === this.joueursDuTournoi[pFocus].playerID)
      {
        idInEvent = i ;
        i = this.tournoi.registeredPlayers.length ;
      }
    }
    return idInEvent ;
  }

  onAssignToTable(): void{
    let fixedTable = this.assignToTable.get('table').value ;

    if (+fixedTable < 0 || +fixedTable > this.tournoi.currentMatches.length - 1)
    { fixedTable = 'none' ; }


    if (!this.tournoiService.checkIfAPlayerIsalreadyAssignedToTable(this.tournoi, +fixedTable))
    {
      this.tournoiService.setFixedTable(this.tournoi, +this.joueursDuTournoi[
        this.playerFocus].playerIndexInEvent, fixedTable) ;

      this.infoMsg = this.joueursDuTournoi[this.playerFocus].firstName + ' ' +
        this.joueursDuTournoi[this.playerFocus].lastName + ' est assigné en table ' + fixedTable ;
      this.joueursDuTournoi[this.playerFocus].fixedOnTable = fixedTable ;
      this.displayErrorMsg = false ;
      this.displayInfoMsg = true ;
    }
    else
    {
      this.errorMsg = 'Un joueur est déjà assigné à cette table' ;
      this.displayInfoMsg = false ;
      this.displayErrorMsg = true ;
    }

    this.assignToTable.reset() ;
  }

  onRemoveFixedTable(pId: number): void{
    this.tournoiService.removeFixedTable(this.tournoi, +this.joueursDuTournoi[this.playerFocus].playerIndexInEvent) ;
    this.joueursDuTournoi[this.playerFocus].fixedOnTable = 'none' ;
  }

  onDropPlayer(pfocus: number): void{
    const playerId = this.findPlayerInEvent(pfocus) ;
    this.tournoiService.dropPlayer(this.tournoi, playerId) ;
    this.joueursDuTournoi[pfocus].status = 'dropped' ;
  }

  onRehabPlayer(pfocus: number): void{
    const playerId = this.findPlayerInEvent(pfocus) ;
    this.tournoiService.rehabPlayer(this.tournoi, playerId) ;
    this.joueursDuTournoi[pfocus].status = 'active' ;
  }

  togleDisplayToPlayers(): void{
    this.displayToPlayers = this.displayToPlayers !== true;
  }

  onOpenDisplayInfos(): void{
    this.router.navigate(['afficherinfos', this.currentTournamentIndex]);
  }

  onSetDecklist(pfocus: number): void{
    const playerId = this.findPlayerInEvent(pfocus) ;
    const decklist = this.formDecklist.get('decklist').value ;
    this.tournoiService.setDecklist(this.tournoi, playerId, decklist) ;
    this.joueursDuTournoi[this.playerFocus].decklist = decklist ;
    this.tournoiService.updateStandingFromScratch(this.tournoi) ;
    this.formDecklist.reset() ;
  }

  onSetCommander(pfocus: number): void{
    const pId = this.findPlayerInEvent(pfocus) ;
    const joueur = this.tournoi.registeredPlayers[pId] ;
    const commander: string = this.formCommander.get('commander').value ;
    let commanderName: string = commander ;
    let commanderForImg = '' ;

    for (let i = 0 ; i < commander.length ; i++)
    {
     if (commander[i] === '/')
     {
       const cut = i + 2 ;
       commanderForImg = commander.replace(/\/\//, '') ;
       commanderForImg = commanderForImg.replace(/\s+/g, '-') ;

       for (let z = 0 ; z < 5 ; z++)
       { commanderForImg = commanderForImg.replace(',', '') ; }

       commanderName = commander.slice(0, commander.length - cut) ;
       i = commander.length ;
     }
    }

    const commanderForUrl = commanderName.replace(/\s+/g, '-') ;
    const requestUrl = 'https://api.scryfall.com/cards/search?q=' + commanderForUrl ;

    this.http.get(requestUrl).subscribe(urlResult => {
      this.urlResult = urlResult ;
      if (this.urlResult.data[0].hasOwnProperty('card_faces'))
      {
        joueur.commander = commanderName ;
        joueur.commanderImgUrl = this.urlResult.data[0].card_faces[0].image_uris.art_crop ;
        this.joueursDuTournoi[pfocus].commander = commanderName ;

        this.tournoi = this.tournoiService.updateTargetPlayerEverywhere(joueur, this.tournoi) ;
        this.tournoiService.saveTargetTournoi(this.tournoi) ;
      }

      else
      {
        joueur.commander = commanderName ;
        joueur.commanderImgUrl = this.urlResult.data[0].image_uris.art_crop ;
        this.joueursDuTournoi[pfocus].commander = commanderName ;

        this.tournoi = this.tournoiService.updateTargetPlayerEverywhere(joueur, this.tournoi) ;
        this.tournoiService.saveTargetTournoi(this.tournoi) ;
      }

      this.formCommander.reset() ;
    }) ;
  }

  onSetPartner(pfocus: number): void{
    const pId = this.findPlayerInEvent(pfocus) ;
    let joueur = this.tournoi.registeredPlayers[pId] ;
    const partner: string = this.formPartner.get('partner').value ;
    let partnerName: string = partner ;
    let partnerForImg = '' ;

    for (let i = 0 ; i < partner.length ; i++)
    {
      if (partner[i] === '/')
      {
        const cut = i + 2 ;
        partnerForImg = partner.replace(/\/\//, '') ;
        partnerForImg = partnerForImg.replace(/\s+/g, '-') ;

        for (let z = 0 ; z < 5 ; z++)
        { partnerForImg = partnerForImg.replace(',', '') ; }

        partnerName = partner.slice(0, partner.length - cut) ;
        i = partner.length ;
      }
    }

    const partnerForUrl = partnerName.replace(/\s+/g, '-') ;
    const requestUrl = 'https://api.scryfall.com/cards/search?q=' + partnerForUrl ;

    this.http.get(requestUrl).subscribe(urlResult => {
      this.urlResult = urlResult ;
      if (this.urlResult.data[0].hasOwnProperty('card_faces'))
      {
        joueur.partner = partnerName ;
        joueur.partnerImgUrl = this.urlResult.data[0].card_faces[0].image_uris.art_crop ;

        joueur = this.tournoiService.sortCommanderAndPartner(joueur) ;
        this.joueursDuTournoi[pfocus] = joueur ;

        this.tournoiService.updateTargetPlayerEverywhere(joueur, this.tournoi) ;
        this.tournoiService.saveTargetTournoi(this.tournoi) ;
      }
      else
      {
        joueur.partner = partnerName ;
        joueur.partnerImgUrl = this.urlResult.data[0].image_uris.art_crop ;

        joueur = this.tournoiService.sortCommanderAndPartner(joueur) ;
        this.joueursDuTournoi[pfocus] = joueur ;

        this.tournoiService.updateTargetPlayerEverywhere(joueur, this.tournoi) ;
        this.tournoiService.saveTargetTournoi(this.tournoi) ;
      }
      this.formPartner.reset() ;
    }) ;
  }

  onKeySearch(event: any): void {
    clearTimeout(this.timeout);
    const $this = this;
    // tslint:disable-next-line:only-arrow-functions
    this.timeout = setTimeout(function(): void {
      if (event.keyCode !== 13) {
        $this.executeListing(event.target.value);
      }
    }, 1000);
  }

  onKeySearchPartner(event: any): void {
    clearTimeout(this.timeout);
    const $this = this;
    // tslint:disable-next-line:only-arrow-functions
    this.timeout = setTimeout(function(): void {
      if (event.keyCode !== 13) {
        $this.executeListingPartner(event.target.value);
      }
    }, 1000);
  }

  executeListing(value: string): void {
    this.commanderAutocomplete.splice(0, this.commanderAutocomplete.length) ;
    const research = this.formCommander.get('commander').value ;
    const request = 'https://api.scryfall.com/cards/search?q=' + research + '+is%3Aduelcommander';
    this.http.get(request).subscribe(requestResult => {
      this.searchResult = requestResult ;

      // tslint:disable-next-line:prefer-for-of
      for (let i = 0 ; i < this.searchResult.data.length ; i++)
      { this.commanderAutocomplete.push(this.searchResult.data[i].name) ; }
    }) ;
  }

  executeListingPartner(value: string): any {
    this.partnerAutocomplete.splice(0, this.partnerAutocomplete.length) ;
    const research = this.formPartner.get('partner').value ;
    const request = 'https://api.scryfall.com/cards/search?q=' + research + '+is%3Aduelcommander';
    this.http.get(request).subscribe(requestResult => {
      this.searchResult = requestResult ;

      // tslint:disable-next-line:prefer-for-of
      for (let i = 0 ; i < this.searchResult.data.length ; i++)
      { this.partnerAutocomplete.push(this.searchResult.data[i].name) ; }
    }) ;
  }

  togleDisplayCommanderImg(): void{
    this.displayCommanderImg = this.displayCommanderImg !== true ;
  }

  deleteCommander(pfocus: number): void{
    const pId = this.findPlayerInEvent(pfocus) ;
    this.deletePartner(pfocus) ;
    this.joueursDuTournoi[pfocus].commander = 'x' ;
    this.joueursDuTournoi[pfocus].commanderImgUrl = 'x' ;
    this.joueursDuTournoi[pfocus].partner = '' ;
    this.joueursDuTournoi[pfocus].partnerImgUrl = null ;
    this.tournoiService.resetCommander(this.tournoi, pId) ;

  }

  deletePartner(pfocus: number): void{
    const pId = this.findPlayerInEvent(pfocus) ;
    this.joueursDuTournoi[pfocus].partner = '' ;
    this.joueursDuTournoi[pfocus].partnerImgUrl = null ;
    this.tournoiService.resetPartner(this.tournoi, pId) ;
  }

  checkIfPlayerIsFixed(pId: number): boolean{
    return this.tournoi.currentStanding[pId].fixedOnTable !== 'none';
  }

  togleDisplayAddPlayerPannel(): void{
    this.dislpayAddPlayerPannel = this.dislpayAddPlayerPannel !== true ;
  }

  searchPlayer(): void{
    const searchValue: any = this.formAddPlayer.get('playerid').value ;
    this.searchPlayerResult = [] ;

    if (searchValue === '')
    { this.searchPlayerResult = [] ; }
    else
    {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0 ; i < this.joueurService.joueurs.length ; i++)
      {
        if (this.joueurService.joueurs[i].firstName.toLowerCase().search(searchValue) > -1 ||
          this.joueurService.joueurs[i].lastName.toLowerCase().search(searchValue) > -1 ||
          this.joueurService.joueurs[i].playerID.toLowerCase().search(searchValue) > -1)
        {
          if (!this.isAlreadyRegistered(this.joueurService.joueurs[i].playerID))
          { this.searchPlayerResult.push(this.joueurService.joueurs[i]) ; }
        }
      }
    }
  }

  isAlreadyRegistered(playerid: string): boolean{
    let found = false ;
    for (let i = 0 ; i < this.tournoi.registeredPlayers.length ; i++)
    {
      if (playerid === this.tournoi.registeredPlayers[i].playerID)
      {
        found = true ;
        i = this.tournoi.registeredPlayers.length ;
      }
    }
    return found ;
  }

  addPlayerDuringEvent(player: Joueur): void{
    this.tournoiService.addPlayerDuringEvent(this.tournoi, player, this.tournoi.rondeEnCours - 1, 0) ;
    this.formAddPlayer.reset() ;
    this.searchPlayerResult = [] ;
    this.dislpayAddPlayerPannel = false ;
  }

  getPlayer(pId: number): Joueur{
    return this.tournoi.registeredPlayers[pId] ;
  }

}
