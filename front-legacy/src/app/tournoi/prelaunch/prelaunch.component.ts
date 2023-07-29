import { Component, OnInit } from '@angular/core';
import {Tournoi} from '../../models/tournoi.model';
import {ActivatedRoute, Router} from '@angular/router';
import {TournoiService} from '../../services/tournoi.service';
import {AuthService} from '../../services/auth.service';
import {RondeService} from '../../services/ronde.service';
import {FormBuilder, FormGroup} from '@angular/forms';
import {bindNodeCallback} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import firebase from 'firebase';

@Component({
  selector: 'app-prelaunch',
  templateUrl: './prelaunch.component.html',
  styleUrls: ['./prelaunch.component.scss']
})
export class PrelaunchComponent implements OnInit {

  tournoi: Tournoi; // Le tournoi sur lequel on travaille
  currentTournamentIndex: number; // Index dans la base du tournoi en cours

  formResearch: FormGroup ;
  formDecklist: FormGroup ;

  toggleDecklistInput: number ;
  toggleCommanderInput: number ;

  searchResult: any ;
  commanderAutocomplete: any[] ;

  timeout: any = null ;
  urlResult: any ;

  constructor(private route: ActivatedRoute,
              private tournoiService: TournoiService,
              private authService: AuthService,
              private formBuilder: FormBuilder,
              private http: HttpClient,
              private router: Router) { }

  ngOnInit(): void {
    this.tournoi = new Tournoi('', '', +'') ;
    this.currentTournamentIndex = this.route.snapshot.params.id;

    this.tournoiService.getTournois();
    this.tournoiService.emitTournois();

    this.tournoiService.getSingleTournoi(this.currentTournamentIndex).then(
      (tournoi: Tournoi) => {
        this.tournoi = tournoi ;
        if (!this.tournoiService.isAuthorPrelaunch(this.tournoi, firebase.auth().currentUser.email))
        { this.router.navigate(['listetournois']) ; }
      }) ;

    this.toggleDecklistInput = -1 ;
    this.toggleCommanderInput = -1 ;

    this.commanderAutocomplete = [] ;

    this.initForm() ;
  }

  initForm(): void{
    this.formResearch = this.formBuilder.group({
      search: [''],
    });

    this.formDecklist = this.formBuilder.group({
      decklist: [''],
      commander: ['']
    }) ;
  }

  onGrantBye(id): void{
    this.tournoiService.grantBye(this.tournoi, id) ;
    // this.tournoi.registeredPlayers[id].hasByes++ ;
  }

  onReduceBye(id): void{
    this.tournoiService.reduceBye(this.tournoi, id) ;
    this.tournoi.registeredPlayers[id].hasByes-- ;
  }

  matchReasearch(pId: number): any{
  const search = this.formResearch.get('search').value ;

  if (search === '') { return true ; }

  else
    {
      return this.tournoi.registeredPlayers[pId].firstName.toLowerCase().search(search) !== -1
        || this.tournoi.registeredPlayers[pId].lastName.toLowerCase().search(search) !== -1
        || this.tournoi.registeredPlayers[pId].nickname.toLowerCase().search(search) !== -1 ;
    }
  }

  onAddDecklist(pId: number): void{
    const decklist = this.formDecklist.get('decklist').value ;
    this.tournoi.registeredPlayers[pId].decklist = decklist ;
    this.tournoiService.setDecklist(this.tournoi, pId, decklist) ;
    this.tournoiService.updateStandingFromScratch(this.tournoi) ;
    this.toggleDecklistInput = -1 ;
  }

  onToggleDeckListInput(nb: number): void{
    this.toggleDecklistInput = nb ;
    this.formDecklist.reset() ;
  }

  onToggleCommander(nb: number): void{
    this.toggleCommanderInput = nb ;
    this.formDecklist.reset() ;
    this.commanderAutocomplete = [] ;
  }

  onLancerRondes(): void{
    this.tournoi.isLive = true ;
    this.tournoi.inscriptionsOuvertes = false ;
    this.tournoi.rondeEnCours = 1 ;
    this.tournoiService.beginTournament(this.currentTournamentIndex) ;
    this.router.navigate(['gererronde', this.currentTournamentIndex]) ;
  }

  onRetourAuxInscriptions(): void{
    this.router.navigate(['/gerertournoi', this.currentTournamentIndex]) ;
  }

  testRequest(): any{
    this.commanderAutocomplete.splice(0, this.commanderAutocomplete.length) ;
    const research = this.formDecklist.get('commander').value ;
    const request = 'https://api.scryfall.com/cards/search?q=' + research + '+is%3Acommander+f%3Aduel';
    this.http.get(request).subscribe(requestResult => {
      this.searchResult = requestResult ;

      // tslint:disable-next-line:prefer-for-of
      for (let i = 0 ; i < this.searchResult.data.length ; i++)
      { this.commanderAutocomplete.push(this.searchResult.data[i].name) ; }
    }) ;
  }

  onSetCommander(pId: number): void{
    const joueur = this.tournoi.registeredPlayers[pId] ;
    const commanderName = this.formDecklist.get('commander').value ;
    const commanderForUrl = commanderName.replace(/\s+/g, '+') ;
    const requestUrl = 'https://api.scryfall.com/cards/search?q=' + commanderForUrl ;

    this.http.get(requestUrl).subscribe(urlResult => {
      this.urlResult = urlResult ;
      if (this.urlResult.data[0].hasOwnProperty('card_faces'))
      {
        joueur.commander = commanderName ;
        joueur.commanderImgUrl = this.urlResult.data[0].card_faces[0].image_uris.art_crop ;

        this.tournoi.registeredPlayers[pId] = joueur ;
        this.tournoiService.saveTargetTournoi(this.tournoi) ;
      }

      else
      {
        joueur.commander = commanderName ;
        joueur.commanderImgUrl = this.urlResult.data[0].image_uris.art_crop ;

        this.tournoi.registeredPlayers[pId] = joueur ;
        this.tournoiService.saveTargetTournoi(this.tournoi) ;
      }
    }) ;

    this.onToggleCommander(-1) ;
  }

  setCmdImg(pId: number, cmd: string): void{

    let url: any = '' ;
    const requestUrl = 'https://api.scryfall.com/cards/search?q=' + cmd ;
    console.log('img ' + cmd) ;
    this.http.get(requestUrl).subscribe(urlResult => {
      this.urlResult = urlResult ;
      url = this.urlResult.data[0].image_uris.art_crop ;
      this.tournoi.registeredPlayers[pId].commanderImgUrl = url ;
      this.tournoiService.setCommanderImg(this.tournoi, pId, cmd, url, 0) ;
    }) ;
  }

  onKeySearch(event: any): any {
    clearTimeout(this.timeout);
    const $this = this;
    // tslint:disable-next-line:only-arrow-functions
    this.timeout = setTimeout(function(): any {
      if (event.keyCode !== 13) {
        $this.executeListing(event.target.value);
      }
    }, 1000);
  }

  executeListing(value: string): any {
    this.commanderAutocomplete.splice(0, this.commanderAutocomplete.length) ;
    const research = this.formDecklist.get('commander').value ;
    const request = 'https://api.scryfall.com/cards/search?q=' + research + '+is%3Aduelcommander';
    this.http.get(request).subscribe(requestResult => {
      this.searchResult = requestResult ;

      // tslint:disable-next-line:prefer-for-of
      for (let i = 0 ; i < this.searchResult.data.length ; i++)
      { this.commanderAutocomplete.push(this.searchResult.data[i].name) ; }
    }) ;
  }
}

