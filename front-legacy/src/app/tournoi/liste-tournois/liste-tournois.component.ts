import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {TournoiService} from '../../services/tournoi.service';
import {Tournoi} from '../../models/tournoi.model';
import {Subscription} from 'rxjs';
import {Ronde} from '../../models/ronde.model';
import {AuthService} from '../../services/auth.service';
import {PermissionsService} from '../../services/permissions.service';
import {HttpClient, HttpParams, HttpHeaders} from '@angular/common/http';
import {ScryfallService} from '../../services/scryfall.service';
import firebase from 'firebase';

@Component({
  selector: 'app-liste-tournois',
  templateUrl: './liste-tournois.component.html',
  styleUrls: ['./liste-tournois.component.scss']
})

export class ListeTournoisComponent implements OnInit, OnDestroy {

  tournois: Tournoi[] ;
  tournoiSubscription: Subscription ;

  rondes: Ronde[] ;

  displayDelete: any;

  apiUrl: string ;
  scryfallRequest: string ;

  imgSrc: string ;

  constructor(private tournoiService: TournoiService,
              private authService: AuthService,
              private permissionService: PermissionsService,
              private http: HttpClient,
              private scryfallService: ScryfallService,
              private router: Router) { }

  ngOnInit(): void {

    this.tournoiSubscription = this.tournoiService.tournoisSubject.subscribe(
      (tournois: Tournoi[]) => {
        this.tournois = [] ;
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0 ; i < tournois.length ; i++)
        {
          if (this.checkStatus(tournois[i]))
          {
            if (this.checkTournamentEditors(tournois[i]))
            { this.tournois.push(tournois[i]) ; }
          }
        }
      }
    );

    /*firebase.database().ref('/tournois').on('value', snapshot => {
      this.tournois = snapshot.val() ;
    }) ;*/

    this.tournoiService.getTournois() ;
    this.tournoiService.emitTournois() ;

    this.displayDelete = false ;
  }

  onNewTournoi(): void {
  this.router.navigate(['/creertournoi']) ;
  }

  onDeleteTournoi(tournoi: Tournoi): void {
    this.tournoiService.deleteTargetTournoi(tournoi) ;
    this.hideDelete() ;
  }

  onOpenTournoi(id: number): void {
    this.router.navigate(['/gerertournoi', this.tournois[id].tournamentId]) ;
  }

  ngOnDestroy(): void {
    this.tournoiSubscription.unsubscribe() ;
  }

  onOpenRondes(id): void{
    this.router.navigate(['gererronde', this.tournois[id].tournamentId]);
  }

  onOpenTop(id): void{
    this.router.navigate(['finalmatches', id]);
  }

  onOpenStandings(id): void{
    this.router.navigate(['tournamentresults', id]);

  }

  onToggleDelete(nb: number): void{
    if (this.displayDelete === false)
    { this.displayDelete = nb ; }
    else
    { this.displayDelete = false ; }
  }

  hideDelete(): void{
    this.displayDelete = false ;
  }

  checkTournamentEditors(tournoi: Tournoi): boolean{
    let isEditor = false ;

    // tslint:disable-next-line:prefer-for-of
    for (let i = 0 ; i < tournoi.editors.length ; i++)
    {
      if (tournoi.editors[i] === this.authService.getCurrentUser().email)
      { isEditor = true ; }
    }
    return isEditor ;
  }

  checkStatus(tournoi: Tournoi): boolean{
    if (tournoi.status !== 'archived')
    { return tournoi.status !== 'deleted'; }
    else { return false ; }
  }
}
