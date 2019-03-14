import { Component, OnInit, OnDestroy, ViewChild, ViewContainerRef } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { Store, select } from '@ngrx/store';
import { GameActions, UserActions } from 'shared-library/core/store/actions';
import { Category, PlayerMode, OpponentType } from 'shared-library/shared/model';
import { AppState, appState } from '../../../store';
import { NewGame } from './new-game';
import { Utils } from 'shared-library/core/services';
import { ObservableArray } from 'tns-core-modules/data/observable-array';
import { TokenModel } from 'nativescript-ui-autocomplete';
import { RadAutoCompleteTextViewComponent } from 'nativescript-ui-autocomplete/angular';
import { RouterExtensions } from 'nativescript-angular/router';
import * as gamePlayActions from './../../store/actions';
import { filter } from 'rxjs/operators';
import { RadListViewComponent } from 'nativescript-ui-listview/angular';
import * as Toast from 'nativescript-toast';
import { Router } from '@angular/router';
import { coreState } from 'shared-library/core/store';
import { ListViewEventData } from 'nativescript-ui-listview';

@Component({
  selector: 'new-game',
  templateUrl: './new-game.component.html',
  styleUrls: ['./new-game.component.scss']
})
export class NewGameComponent extends NewGame implements OnInit, OnDestroy {

  playerMode = 0;
  showSelectPlayer = false;
  showSelectCategory = false;
  showSelectTag = false;
  dataItem;
  categoriesObs: Observable<Category[]>;
  categories: Category[];
  subs: Subscription[] = [];
  customTag: string;
  categoryIds: number[] = [];
  private tagItems: ObservableArray<TokenModel>;
  sub3: Subscription;
  filteredCategories: Category[];

  @ViewChild('autocomplete') autocomplete: RadAutoCompleteTextViewComponent;
  @ViewChild('friendListView') listViewComponent: RadListViewComponent;

  constructor(public store: Store<AppState>,
    public gameActions: GameActions,
    public utils: Utils,
    private routerExtension: RouterExtensions,
    public userActions: UserActions,
    private router: Router) {
    super(store, utils, gameActions, userActions);
    this.initDataItems();
  }
  ngOnInit() {

    this.subs.push(this.store.select(coreState).pipe(select(s => s.newGameId), filter(g => g !== '')).subscribe(gameObj => {
      if (gameObj && gameObj['gameId']) {

        //   console.log(' this.user ', this.user);
        this.routerExtension.navigate(['/game-play', gameObj['gameId']], { clearHistory: true });
        this.store.dispatch(new gamePlayActions.ResetCurrentQuestion());
      }
    }));

    this.subs.push(this.categoriesObs.subscribe(categories => {
      categories.map(category => {
        if (this.user.categoryIds && this.user.categoryIds.length > 0) {
          category.isSelected = this.user.categoryIds.includes(category.id);
        } else if (this.user.lastGamePlayOption && this.user.lastGamePlayOption.categoryIds.length > 0) {
          category.isSelected = this.user.lastGamePlayOption.categoryIds.includes(category.id);
        } else {
          category.isSelected = true;
        }
        return category;
      });
    }));

    this.subs.push(this.store.select(appState.coreState).pipe(select(s => s.gameCreateStatus)).subscribe(gameCreateStatus => {
      if (gameCreateStatus) {
        this.redirectToDashboard(gameCreateStatus);
      }
    }));

    // this.subs.push(this.store.select(appState.coreState).pipe(select(s => s.userFriends)).subscribe(uFriends => {
    //   if (uFriends) {
    //     this.uFriends = [];
    //     uFriends.myFriends.map(friend => {
    //       this.uFriends = [...this.uFriends, ...Object.keys(friend)];
    //     });
    //     this.dataItem = this.uFriends;
    //     this.noFriendsStatus = false;
    //   } else {
    //     this.noFriendsStatus = true;
    //   }
    // }));
    //  this.userDict$ = this.store.select(appState.coreState).pipe(select(s => s.userDict));
    //   this.subs.push(this.userDict$.subscribe(userDict => this.userDict = userDict));

    this.subs.push(this.store.select(appState.coreState).pipe(select(s => s.applicationSettings)).subscribe(appSettings => {
      if (appSettings) {
        this.applicationSettings = appSettings[0];
        let filteredCategories = [];
        if (this.applicationSettings) {
          filteredCategories = this.categories.filter((category) => {
            if (this.applicationSettings.game_play_categories.indexOf(Number(category.id)) > -1) {
              return category;
            }
          });
          if (this.applicationSettings && this.applicationSettings.lives.enable) {
            this.subs.push(this.store.select(appState.coreState).pipe(select(s => s.account)).subscribe(account => {
              if (account) {
                this.life = account.lives;
              }
            }));
          }
        } else {
          filteredCategories = this.categories;
        }

        this.filteredCategories = [...filteredCategories.filter(c => c.requiredForGamePlay),
        ...filteredCategories.filter(c => !c.requiredForGamePlay)];
      }
    }));
  }

  ngOnDestroy() {


    this.utils.unsubscribe(this.subs);

    this.playerMode = undefined;
    this.showSelectPlayer = undefined;
    this.showSelectCategory = undefined;
    this.showSelectTag = undefined;
    this.dataItem = undefined;
    this.categoriesObs = undefined;
    this.categories = [];
    this.subs = [];
    this.customTag = undefined;
    this.categoryIds = [];
    this.tagItems = undefined;
    //  this.sub3.unsubscribe();
    this.filteredCategories = [];

    this.destroy();
  }

  addCustomTag() {
    this.selectedTags.push(this.customTag);
    this.customTag = '';
    this.autocomplete.autoCompleteTextView.resetAutocomplete();
  }

  startGame() {
    this.gameOptions.tags = this.selectedTags;
    this.gameOptions.categoryIds = this.filteredCategories.filter(c => c.requiredForGamePlay || c.isSelected).map(c => c.id);
    if (Number(this.gameOptions.playerMode) === PlayerMode.Opponent && Number(this.gameOptions.opponentType) === OpponentType.Friend
      && !this.friendUserId) {
      if (!this.friendUserId) {
        this.errMsg = 'Please Select Friend';
        Toast.makeText(this.errMsg).show();
      }
      return;
    }
    if (this.applicationSettings.lives.enable && this.life === 0) {
      this.redirectToDashboard(this.gameErrorMsg);
      return false;
    }

    this.startNewGame(this.gameOptions);
  }

  selectCategory(args: ListViewEventData) {
    const category: Category = this.filteredCategories[args.index];
    if (!category.requiredForGamePlay) {
      category.isSelected = !category.isSelected;
    }
  }

  getSelectedCatName() {
    return this.filteredCategories.filter(c => c.requiredForGamePlay || c.isSelected).map(c => c.categoryName).join(', ');
  }

  getPlayerMode() {
    return this.gameOptions.playerMode ? 'Single Player' : 'Two Player';
  }

  getGameMode() {
    let opponentType = '';
    if (this.gameOptions.playerMode === 1) {
      switch (this.gameOptions.opponentType) {
        case 0:
          opponentType = 'Random';
          break;
        case 1:
          opponentType = 'With Friend';
          break;
        case 2:
          opponentType = 'With Computer';
          break;
      }
    }
    return opponentType;
  }

  get dataItems(): ObservableArray<TokenModel> {
    return this.tagItems;
  }

  private initDataItems() {
    this.tagItems = new ObservableArray<TokenModel>();

    for (let i = 0; i < this.tags.length; i++) {
      this.tagItems.push(new TokenModel(this.tags[i], undefined));
    }
  }

  public onDidAutoComplete(args) {
    this.customTag = args.text;
  }

  public onTextChanged(args) {
    this.customTag = args.text;
  }

  selectFriendId(friendId: string) {
    this.friendUserId = friendId;
    this.listViewComponent.listView.refresh();
  }

  navigateToInvite() {
    this.ngOnDestroy();
    this.router.navigate(['/my/app-invite-friends-dialog']);
  }

  redirectToDashboard(msg) {
    this.router.navigate(['/dashboard']);
    Toast.makeText(msg).show();
  }
}

