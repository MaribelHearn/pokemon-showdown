/**
 * Manages the Trivia database.
 *
 * @author Annika
 */

import type {TriviaGame, TriviaHistory, TriviaLeaderboard, TriviaLeaderboardScore, TriviaQuestion} from "./trivia";
import {FS} from "../../../lib";
import {formatSQLArray} from "../../../lib/utils";
import type {Statement} from "../../../lib/sql";

interface TriviaLeaderboards {
	allTime: TriviaLeaderboard;
	notAllTime: TriviaLeaderboard;
}
export interface TriviaDatabase {
	updateLeaderboardForUser(
		userid: ID,
		additions: {allTime: TriviaLeaderboardScore, notAllTime: TriviaLeaderboardScore}
	): Promise<void> | void;
	addHistory(history: Iterable<TriviaHistory>): Promise<void> | void;
	addQuestions(questions: Iterable<TriviaQuestion>): Promise<void> | void;
	addQuestionSubmissions(questions: Iterable<TriviaQuestion>): Promise<void> | void;
	setShouldMoveEventQuestions(shouldMove: boolean): Promise<void> | void;
	mergeLeaderboardEntries(from: ID, to: ID): Promise<void> | void;

	shouldMoveEventQuestions(): Promise<boolean> | boolean;
	moveQuestionToCategory(question: string, newCategory: string): Promise<void> | void;
	migrateCategory(sourceCategory: string, targetCategory: string): Promise<number> | number;
	acceptSubmissions(submissions: string[]): Promise<void> | void;

	getHistory(numberOfLines: number): Promise<TriviaGame[]> | TriviaGame[];
	getScoresForLastGame(): Promise<{[k: string]: number}> | {[k: string]: number};
	getQuestions(
		categories: string[] | 'all',
		limit: number,
		options: {order: 'time' | 'random'}
	): Promise<TriviaQuestion[]> | TriviaQuestion[];
	getLeaderboardEntry(id: ID, isAllTime: boolean): Promise<TriviaLeaderboard | null> | TriviaLeaderboard | null;
	getLeaderboards(): Promise<TriviaLeaderboards> | TriviaLeaderboards;

	checkIfQuestionExists(questionText: string): Promise<boolean> | boolean;
	ensureQuestionExists(questionText: string): Promise<void> | void;
	ensureQuestionDoesNotExist(questionText: string): Promise<void> | void;
	getSubmissions(): Promise<TriviaQuestion[]> | TriviaQuestion[];
	getQuestionCounts(): Promise<{[k: string]: number, total: number}> | {[k: string]: number, total: number};
	searchQuestions(
		search: string,
		options: {searchSubmissions: boolean, caseSensitive?: boolean}
	): Promise<TriviaQuestion[]> | TriviaQuestion[];

	clearSubmissions(): Promise<void> | void;
	clearCategory(category: string): Promise<void> | void;
	deleteQuestion(questionText: string): Promise<void> | void;
	deleteLeaderboardEntry(userid: ID, isAllTime: boolean): Promise<void> | void;
	deleteSubmissions(submissions: string[]): Promise<void> | void;
}

export class TriviaSQLiteDatabase implements TriviaDatabase {
	readyPromise: Promise<void> | null;

	private legacyJSONPath?: string;

	// adding data
	private leaderboardInsertion: Statement | null;
	private questionInsertion: Statement | null;
	private answerInsertion: Statement | null;
	private gameHistoryInsertion: Statement | null;
	private scoreHistoryInsertion: Statement | null;
	private updateMoveEventQuestions: Statement | null;

	// modifying data
	private categoryChangeQuery: Statement | null;
	private leaderboardChangeQuery: Statement | null;
	private migrateCategoryQuery: Statement | null;

	// fetching data
	private historyQuery: Statement | null;
	private historyScoresQuery: Statement | null;
	private allQuestionsRandomOrderQuery: Statement | null;
	private allQuestionsTimeOrderQuery: Statement | null;
	private answersQuery: Statement | null;
	private submissionsQuery: Statement | null;
	private leaderboardQuery: Statement | null;
	private leaderboardByUserQuery: Statement | null;
	private allTimeLeaderboardByUserQuery: Statement | null;
	private notAllTimeLeaderboardByUserQuery: Statement | null;
	private eventQuestionQuery: Statement | null;
	private categoriesQuery: Statement | null;
	private questionCountQuery: Statement | null;
	private categoryQuestionCountQuery: Statement | null;
	private questionSearchQuery: Statement | null;
	private questionExistsQuery: Statement | null;

	// deleting data
	private clearAllSubmissionsQuery: Statement | null;
	private clearCategoryQuery: Statement | null;
	private deleteQuestionQuery: Statement | null;
	private leaderboardDeletionQuery: Statement | null;

	constructor(legacyJSONPath?: string) {
		this.legacyJSONPath = legacyJSONPath;

		this.leaderboardInsertion = null;
		this.questionInsertion = null;
		this.answerInsertion = null;
		this.gameHistoryInsertion = null;
		this.scoreHistoryInsertion = null;
		this.updateMoveEventQuestions = null;

		this.categoryChangeQuery = null;
		this.leaderboardChangeQuery = null;
		this.migrateCategoryQuery = null;

		this.historyQuery = null;
		this.historyScoresQuery = null;
		this.allQuestionsRandomOrderQuery = null;
		this.allQuestionsTimeOrderQuery = null;
		this.answersQuery = null;
		this.submissionsQuery = null;
		this.leaderboardQuery = null;
		this.leaderboardByUserQuery = null;
		this.allTimeLeaderboardByUserQuery = null;
		this.notAllTimeLeaderboardByUserQuery = null;
		this.eventQuestionQuery = null;
		this.categoriesQuery = null;
		this.questionCountQuery = null;
		this.categoryQuestionCountQuery = null;
		this.questionSearchQuery = null;
		this.questionExistsQuery = null;

		this.clearAllSubmissionsQuery = null;
		this.clearCategoryQuery = null;
		this.deleteQuestionQuery = null;
		this.leaderboardDeletionQuery = null;

		this.readyPromise = this.prepareStatements().then(() => {
			void this.convertLegacyJSON();
			this.readyPromise = null;
		});
	}

	/***************************
	 * Methods for adding data *
	 ***************************/
	async updateLeaderboardForUser(
		userid: ID,
		additions: {allTime: TriviaLeaderboardScore, notAllTime: TriviaLeaderboardScore}
	): Promise<void> {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't update the leaderboard for ${userid} because there is no SQL database open.`);
		}

		await this.leaderboardChangeQuery!.run({
			score: additions.allTime.score,
			totalPoints: additions.allTime.totalPoints,
			totalCorrectAnswers: additions.allTime.totalCorrectAnswers,
			userid,
			isAllTime: Number(true),
		});
		await this.leaderboardChangeQuery!.run({
			score: additions.notAllTime.score,
			totalPoints: additions.notAllTime.totalPoints,
			totalCorrectAnswers: additions.notAllTime.totalCorrectAnswers,
			userid,
			isAllTime: Number(false),
		});
	}

	async addHistory(history: Iterable<TriviaHistory>) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't add a Trivia game to the history because there is no SQL database open.`);
		}

		const res = await Chat.database.transaction('addHistory', {
			history,
			gameHistoryInsertion: this.gameHistoryInsertion!.toString(),
			scoreHistoryInsertion: this.scoreHistoryInsertion!.toString(),
		});
		if (!res) throw new Error(`Error updating Trivia history.`);
	}

	async addQuestions(questions: Iterable<TriviaQuestion>) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't add a Trivia question because there is no SQL database open.`);
		}

		const res = await Chat.database.transaction('addQuestions', {
			questions,
			questionInsertion: this.questionInsertion!.toString(),
			answerInsertion: this.answerInsertion!.toString(),
			isSubmission: false,
		});
		if (!res) throw new Chat.ErrorMessage(`Error adding Trivia questions.`);
	}

	async addQuestionSubmissions(questions: Iterable<TriviaQuestion>) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't submit a Trivia question for review because there is no SQL database open.`);
		}

		const res = await Chat.database.transaction('addQuestions', {
			questions,
			questionInsertion: this.questionInsertion!.toString(),
			answerInsertion: this.answerInsertion!.toString(),
			isSubmission: true,
		});
		if (!res) throw new Chat.ErrorMessage(`Error adding Trivia questions for review.`);
	}

	async setShouldMoveEventQuestions(shouldMove: boolean) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't enable/disable moving event questions because there is no SQL database open.`);
		}

		await this.updateMoveEventQuestions!.run([Number(shouldMove)]);
	}

	/******************************
	 * Methods for modifying data *
	 ******************************/
	async mergeLeaderboardEntries(from: ID, to: ID) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't merge ${from} and ${to}'s Trivia leaderboard entries because there is no SQL database open.`);
		}

		for (const isAllTime of [true, false]) {
			const query = isAllTime ? this.allTimeLeaderboardByUserQuery! : this.notAllTimeLeaderboardByUserQuery!;
			const fromScores = await query.get([from]);
			const toScores = await query.get([to]);

			toScores.score += fromScores.score;
			toScores.totalCorrectAnswers += fromScores.totalCorrectAnswers;
			toScores.totalPoints += fromScores.totalPoints;

			await Chat.database.run(
				this.leaderboardInsertion!,
				[to, toScores.score, toScores.totalPoints, toScores.totalCorrectAnswers, Number(isAllTime)]
			);
			await this.leaderboardDeletionQuery!.run([from, Number(isAllTime)]);
		}
	}

	async shouldMoveEventQuestions() {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't find out if we are moving event questions because there is no SQL database open.`);
		}

		return (await this.eventQuestionQuery!.get([]) || {value: false}).value;
	}

	async moveQuestionToCategory(question: string, newCategory: string) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't move question category because there is no SQL database open.`);
		}
		await this.categoryChangeQuery!.run([newCategory, question]);
	}

	async migrateCategory(sourceCategory: string, targetCategory: string) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't migrate categories because there is no SQL database open.`);
		}

		const {changes} = await this.migrateCategoryQuery!.run([targetCategory, sourceCategory]);
		return changes;
	}

	async acceptSubmissions(submissions: string[]) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't accept Trivia question submissions because there is no SQL database open.`);
		}

		const query = await Chat.database.prepare(
			`UPDATE trivia_questions SET is_submission = 1 WHERE question IN (${formatSQLArray(submissions)})`
		);
		await query?.run(submissions);
	}

	/*****************************
	 * Methods for fetching data *
	 *****************************/
	async getHistory(numberOfLines = 10): Promise<TriviaGame[]> {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) throw new Chat.ErrorMessage(`Can't get Trivia game history because there is no SQL database open.`);
		const rows = await this.historyQuery!.all([numberOfLines]);
		return rows.map((row: AnyObject): TriviaGame => ({
			mode: row.mode,
			length: /^d+$/.test(row.length) ? parseInt(row.length) || row.length : row.length,
			category: row.category,
			creator: row.creator || undefined,
			givesPoints: row.givesPoints !== 0,
			startTime: row.time,
		}));
	}

	async getScoresForLastGame(): Promise<{[k: string]: number}> {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) throw new Chat.ErrorMessage(`Can't get Trivia game scores because there is no SQL database open.`);
		const {game_id} = await this.historyQuery!.get([1]);

		const results: {[k: string]: number} = {};
		for (const row of await this.historyScoresQuery!.all([game_id])) {
			results[row.userid] = row.score;
		}
		return results;
	}

	async getQuestions(
		categories: string[] | 'all',
		limit: number,
		options: {order: 'time' | 'random'}
	): Promise<TriviaQuestion[]> {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) throw new Chat.ErrorMessage(`Can't get Trivia questions because there is no SQL database open.`);

		let query;
		let args;
		if (categories === 'all') {
			if (options.order === 'time') {
				query = this.allQuestionsTimeOrderQuery!;
			} else {
				query = this.allQuestionsRandomOrderQuery!;
			}
			args = [limit];
		} else {
			query = await Chat.database.prepare(
				`SELECT * FROM trivia_questions WHERE category IN (${formatSQLArray(categories)}) AND is_submission = 0 ORDER BY ${options.order === 'time' ? 'added_at DESC' : 'RANDOM()'} LIMIT ?`
			);
			args = [...categories, limit];
		}

		if (!query) throw new Error(`Couldn't prepare query`);
		const rows = await query.all(args);
		return Promise.all(rows.map((row: AnyObject) => this.rowToQuestion(row)));
	}

	async getLeaderboardEntry(id: ID, isAllTime: boolean): Promise<TriviaLeaderboard | null> {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't find out if user ${id} has a Trivia leaderboard entry because there is no SQL database open.`);
		}

		const row = await this.leaderboardByUserQuery!.get([id, Number(isAllTime)]);
		if (!row) return null;
		return {
			score: row.score,
			totalPoints: row.total_points,
			totalCorrectAnswers: row.total_correct_answers,
		};
	}

	async getLeaderboards(): Promise<{
		allTime: TriviaLeaderboard,
		notAllTime: TriviaLeaderboard,
	}> {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't get the Trivia leaderboard scores because there is no SQL database open.`);
		}

		const result: TriviaLeaderboards = {
			allTime: {},
			notAllTime: {},
		};
		const rows = await this.leaderboardQuery!.all([]);
		for (const row of rows) {
			const entry = {
				score: row.score,
				totalPoints: row.total_points,
				totalCorrectAnswers: row.total_correct_answers,
			};

			if (row.is_all_time) {
				result.allTime[row.userid] = entry;
			} else {
				result.notAllTime[row.userid] = entry;
			}
		}

		return result;
	}

	async checkIfQuestionExists(questionText: string) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't check if a Trivia question already exists because there is no SQL database open.`);
		}

		const {count} = await this.questionExistsQuery!.get([questionText]);
		return count > 0;
	}

	async ensureQuestionExists(questionText: string) {
		if (!(await this.checkIfQuestionExists(questionText))) {
			throw new Chat.ErrorMessage(`Question "${questionText}" is not in the question database.`);
		}
	}

	async ensureQuestionDoesNotExist(questionText: string) {
		if (await this.checkIfQuestionExists(questionText)) {
			throw new Chat.ErrorMessage(`Question "${questionText}" is already in the question database.`);
		}
	}

	async getSubmissions(): Promise<TriviaQuestion[]> {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't retrieve the Trivia question submissions because there is no SQL database open.`);
		}

		const rows = await this.submissionsQuery!.all([]);
		return Promise.all(rows.map((row: AnyObject) => this.rowToQuestion(row)));
	}

	async getQuestionCounts(): Promise<{[k: string]: number, total: number}> {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't retrieve the Trivia question counts because there is no SQL database open.`);
		}

		const allCategories = (await this.categoriesQuery!.all([])).map((row: AnyObject) => row.category);
		const total = (await this.questionCountQuery!.get([])).count;

		const result: {[k: string]: number, total: number} = {total};
		for (const category of allCategories) {
			result[category] = (await this.categoryQuestionCountQuery!.get([category])).count;
		}
		return result;
	}

	async searchQuestions(
		search: string,
		options: {searchSubmissions: boolean, caseSensitive?: boolean}
	): Promise<TriviaQuestion[]> {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't search Trivia questions because there is no SQL database open.`);
		}

		if (options.caseSensitive) await Chat.database.exec(`PRAGMA case_sensitive_like = true;`);
		const rows = await this.questionSearchQuery!.all([`%${search}%`, Number(options.searchSubmissions)]);
		if (options.caseSensitive) await Chat.database.exec(`PRAGMA case_sensitive_like = false;`);

		return Promise.all(rows.map((row: AnyObject) => this.rowToQuestion(row)));
	}


	/*****************************
	 * Methods for deleting data *
	 * ***************************/
	async clearSubmissions() {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't clear the Trivia question submissions because there is no SQL database open.`);
		}

		await Chat.database.run(this.clearAllSubmissionsQuery!, []);
	}

	async clearCategory(category: string) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't clear the Trivia questions in category "${category}" because there is no SQL database open.`);
		}

		await Chat.database.run(this.clearCategoryQuery!, [category]);
	}

	async deleteQuestion(questionText: string) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't delete the Trivia question because there is no SQL database open.`);
		}

		await Chat.database.run(this.deleteQuestionQuery!, [questionText]);
	}

	async deleteLeaderboardEntry(userid: ID, isAllTime: boolean) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't delete leaderboard entries because there is no SQL database open.`);
		}

		await this.leaderboardDeletionQuery!.run([userid, Number(isAllTime)]);
	}

	async deleteSubmissions(submissions: string[]) {
		if (this.readyPromise) await this.readyPromise;
		if (!Chat.database) {
			throw new Chat.ErrorMessage(`Can't delete Trivia question submissions because there is no SQL database open.`);
		}

		const query = await Chat.database.prepare(
			`DELETE FROM trivia_questions WHERE is_submission = 1 AND question IN (${formatSQLArray(submissions)})`
		);
		await query?.run(submissions);
	}

	/****************************************
	 * Private helper methods	 			*
	 * These are not part of the public API *
	 ****************************************/
	private async prepareStatements() {
		if (Chat.databaseReadyPromise) await Chat.databaseReadyPromise;
		if (!Chat.database) {
			if (!Config.usesqlite) return;
			throw new Error(`Awaited Chat.databaseReadyPromise and SQLite is enabled, but Chat.database is still falsy.`);
		}

		this.leaderboardInsertion = await Chat.database.prepare(
			`INSERT OR REPLACE INTO trivia_leaderboard (userid, score, total_points, total_correct_answers, is_all_time) VALUES (?, ?, ?, ?, ?) `
		);
		this.questionInsertion = await Chat.database.prepare(
			`INSERT OR IGNORE INTO trivia_questions (question, category, added_at, userid, is_submission) VALUES (?, ?, ?, ?, ?)`
		);
		this.answerInsertion = await Chat.database.prepare(
			`INSERT INTO trivia_answers (question_id, answer) VALUES (?, ?)`
		);
		this.gameHistoryInsertion = await Chat.database.prepare(
			`INSERT INTO trivia_game_history (mode, length, category, time, creator, gives_points) VALUES (?, ?, ?, ?, ?, ?)`
		);
		this.scoreHistoryInsertion = await Chat.database.prepare(
			`INSERT INTO trivia_game_scores (game_id, userid, score) VALUES (?, ?, ?)`
		);
		this.updateMoveEventQuestions = await Chat.database.prepare(
			`INSERT OR REPLACE INTO trivia_settings (key, value) VALUES ('moveEventQuestions', ?)`
		);

		this.categoryChangeQuery = await Chat.database.prepare(
			`UPDATE trivia_questions SET category = ? WHERE question = ?`
		);
		this.leaderboardChangeQuery = await Chat.database.prepare(
			`INSERT INTO trivia_leaderboard (userid, score, total_points, total_correct_answers, is_all_time) ` +
			`VALUES ($userid, $score, $totalPoints, $totalCorrectAnswers, $isAllTime) ON CONFLICT DO ` +
			`UPDATE SET score = score + $score, total_points = total_points + $totalPoints, total_correct_answers = total_correct_answers + $totalCorrectAnswers ` +
			`WHERE userid = $userid AND is_all_time = $isAllTime`
		);
		this.migrateCategoryQuery = await Chat.database.prepare(
			`UPDATE OR REPLACE trivia_questions SET category = ? WHERE category = ?`
		);

		this.historyQuery = await Chat.database.prepare(
			`SELECT * FROM trivia_game_history ORDER BY time DESC LIMIT ?`
		);
		this.historyScoresQuery = await Chat.database.prepare(`SELECT userid, score FROM trivia_game_scores WHERE game_id = ?`);
		this.allQuestionsRandomOrderQuery = await Chat.database.prepare(
			`SELECT * FROM trivia_questions WHERE category IN ('ae', 'pokemon', 'sg', 'sh') AND is_submission = 0 ORDER BY RANDOM() LIMIT ?`
		);
		this.allQuestionsTimeOrderQuery = await Chat.database.prepare(
			`SELECT * FROM trivia_questions WHERE category IN ('ae', 'pokemon', 'sg', 'sh') AND is_submission = 0 ORDER BY added_at DESC LIMIT ?`
		);
		this.answersQuery = await Chat.database.prepare(
			`SELECT * FROM trivia_answers WHERE question_id = ?`
		);
		this.submissionsQuery = await Chat.database.prepare(
			`SELECT * FROM trivia_questions WHERE is_submission = 1 ORDER BY category ASC`
		);
		this.leaderboardQuery = await Chat.database.prepare(
			`SELECT * FROM trivia_leaderboard`
		);
		this.leaderboardByUserQuery = await Chat.database.prepare(
			`SELECT * FROM trivia_leaderboard WHERE userid = ? AND is_all_time = ?`
		);
		this.allTimeLeaderboardByUserQuery = await Chat.database.prepare(
			`SELECT score, total_points as totalPoints, total_correct_answers as totalCorrectAnswers FROM trivia_leaderboard WHERE is_all_time = 1 AND userid = ?`
		);
		this.notAllTimeLeaderboardByUserQuery = await Chat.database.prepare(
			`SELECT score, total_points as totalPoints, total_correct_answers as totalCorrectAnswers FROM trivia_leaderboard WHERE is_all_time = 0 AND userid = ?`
		);
		this.eventQuestionQuery = await Chat.database.prepare(
			`SELECT * FROM trivia_settings WHERE key = 'moveEventQuestions'`
		);
		this.categoriesQuery = await Chat.database.prepare(
			`SELECT DISTINCT category FROM trivia_questions`
		);
		this.questionCountQuery = await Chat.database.prepare(
			`SELECT count(*) AS count FROM trivia_questions WHERE is_submission = 0`
		);
		this.categoryQuestionCountQuery = await Chat.database.prepare(
			`SELECT count(*) AS count FROM trivia_questions WHERE category = ? AND is_submission = 0`
		);
		this.questionSearchQuery = await Chat.database.prepare(
			`SELECT * FROM trivia_questions WHERE question LIKE ? AND is_submission = ? ORDER BY added_at DESC`
		);
		this.questionExistsQuery = await Chat.database.prepare(
			`SELECT count(*) AS count FROM trivia_questions WHERE question = ?`
		);

		this.leaderboardDeletionQuery = await Chat.database.prepare(
			`DELETE FROM trivia_leaderboard WHERE userid = ? AND is_all_time = ?`
		);
		this.clearAllSubmissionsQuery = await Chat.database.prepare(
			`DELETE FROM trivia_questions WHERE is_submission = 1`
		);
		this.clearCategoryQuery = await Chat.database.prepare(
			`DELETE FROM trivia_questions WHERE category = ? AND is_submission = 0`
		);
		this.deleteQuestionQuery = await Chat.database.prepare(
			`DELETE FROM trivia_questions WHERE question = ?`
		);

		await Chat.database.exec("PRAGMA foreign_keys = ON;");
		await Chat.database.loadExtension('server/chat-plugins/trivia/transactions.ts');
	}

	private async convertLegacyJSON() {
		if (!Chat.database || !this.legacyJSONPath) return;
		if (this.readyPromise) await this.readyPromise;
		let triviaData;
		try {
			triviaData = JSON.parse(FS(this.legacyJSONPath).readIfExistsSync() || "{}");
			if (!triviaData) throw new Error(`no JSON`);
		} catch (e) {
			return;
		}

		// handle _old_ JSON format (just in case)
		if (Array.isArray(triviaData.submissions)) {
			const oldSubmissions = triviaData.submissions as TriviaQuestion[];
			triviaData.submissions = {};

			for (const question of oldSubmissions) {
				if (!(question.category in triviaData.submissions)) triviaData.submissions[question.category] = [];
				triviaData.submissions[question.category].push(question);
			}
		}
		if (Array.isArray(triviaData.questions)) {
			const oldSubmissions = triviaData.questions as TriviaQuestion[];
			triviaData.questions = {};

			for (const question of oldSubmissions) {
				if (!(question.category in triviaData.questions)) triviaData.questions[question.category] = [];
				triviaData.questions[question.category].push(question);
			}
		}

		// convert leaderboard
		if (typeof triviaData.leaderboard === 'object') {
			for (const userid in triviaData.leaderboard) {
				const [score, totalGamePoints, totalCorrectAnswers] = triviaData.leaderboard[userid];
				await Chat.database.run(
					this.leaderboardInsertion!,
					[userid, score, totalGamePoints, totalCorrectAnswers, Number(true)]
				);
			}
		}
		if (typeof triviaData.altLeaderboard === 'object') {
			for (const userid in triviaData.altLeaderboard) {
				const [score, totalGamePoints, totalCorrectAnswers] = triviaData.altLeaderboard[userid];
				await Chat.database.run(
					this.leaderboardInsertion!,
					[userid, score, totalGamePoints, totalCorrectAnswers, Number(false)]
				);
			}
		}

		// convert questions
		const addedAt = Date.now();
		if (typeof triviaData.questions === 'object') {
			for (const category in triviaData.questions) {
				for (const question of triviaData.questions[category]) {
					if (!question.addedAt) question.addedAt = addedAt;
					if (!question.user) question.user = 'unknown user';
					question.question = question.question.trim();
					await this.addQuestions([question]);
				}
			}
		}

		if (typeof triviaData.submissions === 'object') {
			for (const category in triviaData.submissions) {
				for (const question of triviaData.submissions[category]) {
					if (!question.addedAt) question.addedAt = addedAt;
					if (!question.user) question.user = 'unknown user';
					question.question = question.question.trim();
					await this.addQuestionSubmissions([question]);
				}
			}
		}

		if (Array.isArray(triviaData.history)) {
			const now = Date.now();
			for (const game of triviaData.history) {
				if (!game.startTime) game.startTime = now;
				await this.addHistory([game]);
			}
		}

		if (triviaData.moveEventQuestions) {
			await this.setShouldMoveEventQuestions(true);
		}

		// move legacy JSON file
		try {
			await FS(this.legacyJSONPath).rename(this.legacyJSONPath + '.converted');
		} catch (e) {}
	}

	private rowToQuestion(row: AnyObject): Promise<TriviaQuestion> {
		return Chat.database!.all(this.answersQuery!, [row.question_id]).then(answerRows => ({
			question: row.question,
			category: row.category,
			answers: answerRows.map((answerRow: AnyObject) => answerRow.answer),
			user: row.userid,
			addedAt: row.added_at,
		}));
	}
}
