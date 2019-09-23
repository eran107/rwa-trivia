import { Component, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Store, select } from '@ngrx/store';
import { RouterExtensions } from 'nativescript-angular/router';
import { QuestionActions } from 'shared-library/core/store';
import { User, Question, QuestionStatus } from 'shared-library/shared/model';
import { AppState, appState } from '../../../store';
import { MyQuestions } from './my-questions';
import { Page } from 'tns-core-modules/ui/page';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { FirebaseScreenNameConstants } from 'shared-library/shared/model';
import { Utils } from 'shared-library/core/services';

@Component({
  selector: 'my-questions',
  templateUrl: './my-questions.component.html',
  styleUrls: ['./my-questions.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

@AutoUnsubscribe({ 'arrayName': 'subscriptions' })
export class MyQuestionsComponent extends MyQuestions implements OnDestroy, OnInit {

  userDict$: Observable<{ [key: string]: User }>;
  userDict: { [key: string]: User } = {};
  displayReasonViewer = false;
  displayEditQuestion = false;
  selectedQuestion: Question;
  tabIndex = 0;
  subscriptions = [];
  renderView = false;

  constructor(public store: Store<AppState>,
    public questionActions: QuestionActions,
    public routerExtension: RouterExtensions,
    public page: Page,
    public cd: ChangeDetectorRef,
    private utils: Utils
  ) {
    super(store, questionActions, cd);

  }

  ngOnInit(): void {

    this.userDict$ = this.store.select(appState.coreState).pipe(select(s => s.userDict));
    this.subscriptions.push(this.userDict$.subscribe(userDict => {
      this.userDict = userDict;
      this.cd.markForCheck();
    }));
    this.page.on('loaded', () => { this.renderView = true; this.cd.markForCheck(); });
  }

  navigateToSubmitQuestion() {
    this.routerExtension.navigate(['/user/my/questions/add']);
  }

  displayReason(reasonFlag: boolean) {
    this.displayReasonViewer = reasonFlag;
    this.page.actionBarHidden = reasonFlag;
  }

  setSelectedQuestion(question: Question) {
    this.selectedQuestion = question;
  }

  showUpdateQuestion(displayFlag: boolean) {
    this.displayReasonViewer = false;
    this.displayEditQuestion = displayFlag;
    this.page.actionBarHidden = !displayFlag;
  }

  hideQuestion(displayEditQuestion: boolean) {
    this.displayEditQuestion = false;
    this.page.actionBarHidden = false;
  }

  getDisplayStatus(status: number): string {
    return QuestionStatus[status];
  }

  setTabIndex(index: number) {
    this.tabIndex = index;
  }
  ngOnDestroy() {
    this.page.off('loaded');
    this.renderView = false;
  }

}
