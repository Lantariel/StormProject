import {Joueur} from './joueur.model';

export class Match {

  /* Informations du match */
  public tournamentName: string ; // Id du tournoi dans lequel le match a lieu
  public scoreJ1: number ; // Score du joueur 1 dans le match
  public scoreJ2: number ; // Score du joueur 2 dans le match
  public scoreAlreadySubmitted: boolean ; // False si aucun score n'a encore été rentré
  public table: any ;
  public additionalTime: number ;
  public dropj1: boolean ;
  public dropj2: boolean ;

  /* Composants du match */
  public joueur1: number ; // ID du joueur 1 au sein du match
  public joueur2: number ; // ID du joueur 2 au sein du match

  constructor(jo1: number, jo2: number) {
    this.scoreAlreadySubmitted = false ;
    this.scoreJ1 = 0 ;
    this.scoreJ2 = 0 ;
    this.joueur1 = jo1 ;
    this.joueur2 = jo2 ;
    this.additionalTime = 0 ;
    this.dropj1 = false ;
    this.dropj2 = false ;
  }
}
