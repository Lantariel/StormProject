import {Entity, model, property} from '@loopback/repository';

@model({settings: 
  {strict: true,
  idInjection: false,
  forceid: false}
})
export class Tournament extends Entity {
  @property({
    type: 'string',
    required: true,
  })
  Nom: string;

  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4'
  })
  ID?: string;

  constructor(data?: Partial<Tournament>) {
    super(data);
  }
}

export interface TournamentRelations {
  // describe navigational properties here
}

export type TournamentWithRelations = Tournament & TournamentRelations;
