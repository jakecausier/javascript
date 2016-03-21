/* jshint browser: true */

var isUndefined = require( "lodash/lang/isUndefined" );
var difference = require( "lodash/array/difference" );

/**
 * defines the variables used for the scoreformatter, runs the outputScore en overallScore
 * functions.
 *
 * @param {App} args
 * @constructor
 */
var ScoreFormatter = function( args ) {
	this.scores = args.scores;
	this.overallScore = args.overallScore;
	this.outputTarget = args.outputTarget;
	this.overallTarget = args.overallTarget;
	this.totalScore = 0;
	this.keyword = args.keyword;
	this.i18n = args.i18n;
	this.saveScores = args.saveScores;
};

/**
 * Renders the score in the HTML.
 */
ScoreFormatter.prototype.renderScore = function() {
	this.outputScore();
	this.outputOverallScore();
};

/**
 * creates the list for showing the results from the analyzerscorer
 */
ScoreFormatter.prototype.outputScore = function() {
	var seoScoreText, scoreRating;

	this.sortScores();

	var outputTarget = document.getElementById( this.outputTarget );
	outputTarget.innerHTML = "";
	var newList = document.createElement( "ul" );
	newList.className = "wpseoanalysis";
	for ( var i = 0; i < this.scores.length; i++ ) {
		if ( this.scores[ i ].text !== "" ) {
			scoreRating = this.scoreRating( this.scores[ i ].score );

			var newLI = document.createElement( "li" );
			newLI.className = "score";
			var scoreSpan = document.createElement( "span" );
			scoreSpan.className = "wpseo-score-icon " + scoreRating;
			newLI.appendChild( scoreSpan );

			seoScoreText = this.getSEOScoreText( scoreRating );

			var screenReaderDiv = document.createElement( "span" );
			screenReaderDiv.className = "screen-reader-text";
			screenReaderDiv.textContent = seoScoreText;

			newLI.appendChild( screenReaderDiv );
			var textSpan = document.createElement( "span" );
			textSpan.className = "wpseo-score-text";
			textSpan.innerHTML = this.scores[ i ].text;
			newLI.appendChild( textSpan );
			newList.appendChild( newLI );
		}
	}
	outputTarget.appendChild( newList );
};

/**
 * sorts the scores array on ascending scores
 */
ScoreFormatter.prototype.sortScores = function() {
	var unsortables = this.getUndefinedScores( this.scores );
	var sortables = difference( this.scores, unsortables );

	sortables.sort( function( a, b ) {
		return a.score - b.score;
	} );

	this.scores = unsortables.concat( sortables );
};

/**
 * Extracts scorers with a score of undefined
 *
 * @param {Array} scorers The scorers that are being sorted
 * @returns {Array} The scorers that cannot be sorted
 */
ScoreFormatter.prototype.getUndefinedScores = function( scorers ) {
	var filtered = scorers.filter( function( scorer ) {
		return isUndefined( scorer.score ) || scorer.score === "na";
	} );

	return filtered;
};

/**
 * outputs the overallScore in the overallTarget element.
 */
ScoreFormatter.prototype.outputOverallScore = function() {
	var overallTarget = document.getElementById( this.overallTarget );

	if ( overallTarget ) {
		overallTarget.className = "overallScore " + this.overallScoreRating( Math.round( this.overallScore ) );
		if ( this.keyword === "" ) {
			overallTarget.className = "overallScore " + this.overallScoreRating( "na" );
		}
	}

	this.saveScores( this.overallScore );
};

/**
 * Retuns a string that is used as a CSSclass, based on the numeric score or the NA string.
 *
 * @param {number|string} score
 * @returns {string} scoreRate
 */
ScoreFormatter.prototype.scoreRating = function( score ) {
	var scoreRate;
	switch ( true ) {
		case score <= 4:
			scoreRate = "bad";
			break;
		case score > 4 && score <= 7:
			scoreRate = "ok";
			break;
		case score > 7:
			scoreRate = "good";
			break;
		default:
		case score === "na":
			scoreRate = "na";
			break;
	}
	return scoreRate;
};

/**
 * Divides the total score by ten and calls the scoreRating function.
 *
 * @param {number|string} score
 * @returns {string} scoreRate
 */
ScoreFormatter.prototype.overallScoreRating = function( score ) {
	if ( typeof score === "number" ) {
		score = ( score / 10 );
	}
	return this.scoreRating( score );
};

/**
 * Returns a translated score description based on the textual score rating
 *
 * @param {string} scoreRating Textual score rating, can be retrieved with scoreRating from the actual score.
 *
 * @return {string}
 */
ScoreFormatter.prototype.getSEOScoreText = function( scoreRating ) {
	var scoreText = "";

	switch ( scoreRating ) {
		case "na":
			scoreText = this.i18n.dgettext( "js-text-analysis", "No keyword" );
			break;

		case "bad":
			scoreText = this.i18n.dgettext( "js-text-analysis", "Bad SEO score" );
			break;

		case "ok":
			scoreText = this.i18n.dgettext( "js-text-analysis", "Ok SEO score" );
			break;

		case "good":
			scoreText = this.i18n.dgettext( "js-text-analysis", "Good SEO score" );
			break;
	}

	return scoreText;
};

module.exports = ScoreFormatter;
