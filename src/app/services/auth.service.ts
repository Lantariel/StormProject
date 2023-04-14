import { Injectable } from '@angular/core';
import { firebase } from '@firebase/app';
import '@firebase/auth' ;
import {Permission} from '../models/permission.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }

  createNewUser(email: string, password: string): any {
    return new Promise(
      (resolve, reject) => {
        firebase.auth().createUserWithEmailAndPassword(email, password).then(
          () => {
            resolve();
          },
          (error) => {
            reject(error);
          }
        );
      }
    );
  }

  signInUser(email: string, password: string): any {
    return new Promise(
      (resolve, reject) => {
        firebase.auth().signInWithEmailAndPassword(email, password).then(
          () => {
            resolve() ;
          },
          (error) => {
            reject(error) ;
          }
        );
      }
    );
  }

  signOutUser(): any {
    firebase.auth().signOut() ;
  }

  getCurrentUser(): any{
    const user = firebase.auth().currentUser;

    if (user)
    { return user ; }
    else { return null ; }
  }
}
