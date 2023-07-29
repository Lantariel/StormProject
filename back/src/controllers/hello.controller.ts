// Uncomment these imports to begin using these cool features!

import {get} from '@loopback/rest';


export class HelloController {
  @get('/hello')
  hello(): string {
    return 'Hello world!';
  }
}
