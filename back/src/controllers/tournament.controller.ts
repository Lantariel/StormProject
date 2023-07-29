import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
} from '@loopback/rest';
import {Tournament} from '../models';
import {TournamentRepository} from '../repositories';

export class TournamentController {
  constructor(
    @repository(TournamentRepository)
    public tournamentRepository : TournamentRepository,
  ) {}

  @post('/tournaments')
  @response(200, {
    description: 'Tournament model instance',
    content: {'application/json': {schema: getModelSchemaRef(Tournament)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Tournament, {
            title: 'NewTournament',
            exclude: ['ID'],
          }),
        },
      },
    })
    tournament: Omit<Tournament, 'ID'>,
  ): Promise<Tournament> {
    return this.tournamentRepository.create(tournament);
  }

  @get('/tournaments/count')
  @response(200, {
    description: 'Tournament model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Tournament) where?: Where<Tournament>,
  ): Promise<Count> {
    return this.tournamentRepository.count(where);
  }

  @get('/tournaments')
  @response(200, {
    description: 'Array of Tournament model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Tournament, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Tournament) filter?: Filter<Tournament>,
  ): Promise<Tournament[]> {
    return this.tournamentRepository.find(filter);
  }

  @patch('/tournaments')
  @response(200, {
    description: 'Tournament PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Tournament, {partial: true}),
        },
      },
    })
    tournament: Tournament,
    @param.where(Tournament) where?: Where<Tournament>,
  ): Promise<Count> {
    return this.tournamentRepository.updateAll(tournament, where);
  }

  @get('/tournaments/{id}')
  @response(200, {
    description: 'Tournament model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Tournament, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Tournament, {exclude: 'where'}) filter?: FilterExcludingWhere<Tournament>
  ): Promise<Tournament> {
    return this.tournamentRepository.findById(id, filter);
  }

  @patch('/tournaments/{id}')
  @response(204, {
    description: 'Tournament PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Tournament, {partial: true}),
        },
      },
    })
    tournament: Tournament,
  ): Promise<void> {
    await this.tournamentRepository.updateById(id, tournament);
  }

  @put('/tournaments/{id}')
  @response(204, {
    description: 'Tournament PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() tournament: Tournament,
  ): Promise<void> {
    await this.tournamentRepository.replaceById(id, tournament);
  }

  @del('/tournaments/{id}')
  @response(204, {
    description: 'Tournament DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.tournamentRepository.deleteById(id);
  }
}
