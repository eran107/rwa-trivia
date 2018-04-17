import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from 'angularfire2/firestore';
import { Observable } from 'rxjs/Observable';
import { Game } from '../../model';

@Injectable()
export class StatsService {

    constructor(private db: AngularFirestore) { }

    getScoreInfo(categoryList: any): any {

        // Get game with gameover=true and contains winnerId
        return this.db.collection('/games', ref => ref.where('gameOver', '==', true))
            .valueChanges()
            .map(gs => gs.map(g => {
                if (Game.getViewModel(g).winnerPlayerId !== undefined) {
                    return Game.getViewModel(g);
                }


            })).map(games => {  // Create category array and bring each game category with it
                const gameList = [];
                Object.keys(categoryList).map((key) => {
                    gameList[key] = [];
                });

                games.map((game) => {
                    if (game !== undefined) {
                        game.gameOptions.categoryIds.forEach((catId) => {
                            gameList[catId].push(game);
                        });
                    }

                });

                return gameList;

            }).map(gameList => { // Combine category with user and its gameid

                const finalResult = {};
                Object.keys(gameList).map((key) => {
                    const winCount = {};
                    gameList[key].map(element => {
                        if (winCount[element.winnerPlayerId] === undefined) {
                            winCount[element.winnerPlayerId] = new Array(element._gameId);
                        } else {
                            if (winCount[element.winnerPlayerId].indexOf(element._gameId) === -1) {
                                winCount[element.winnerPlayerId].push(element._gameId);
                            }
                        }
                        finalResult[key] = winCount;
                    });

                });
                return finalResult;

            });
    }
}
