import { get, merge } from "lodash-es";
import Assessment from "../../assessment";
import getLanguage from "../../helpers/getLanguage";
import getSentences from "../../stringProcessing/getSentences";
import { markWordsInSentences } from "../../stringProcessing/markWordsInSentences";
import AssessmentResult from "../../values/AssessmentResult";
import { createAnchorOpeningTag } from "../../helpers/shortlinker";
import countWords from "../../stringProcessing/countWords";
import formatNumber from "../../helpers/formatNumber";
import { inRangeEndInclusive as inRange } from "../../helpers/inRange";

/**
 * Represents the assessment that will look if the text aligns with the ranking intention of the keyphrase.
 */
class SingularPluralAssessment extends Assessment {
	/**
	 * Sets the identifier and the config.
	 *
	 * @param {Object} [config]             The configuration to use.
	 *
	 * @param {number} [config.scores.good] The score to return if the text aligns with the ranking intention of the keyphrase.
	 * @param {number} [config.scores.okay] The score to return if the text does not reflect any specific ranking intention.
	 * @param {number} [config.scores.bad]  The score to return if the text does not align with the ranking intention of the keyphrase.
	 *
	 * @param {string} [config.url]         The URL to the relevant KB article.
	 *
	 * @returns {void}
	 */
	constructor( config = {} ) {
		super();

		const defaultConfig = {
			scores: {
				good: 9,
				okay: 6,
				bad: 3,
				consideration: 0,
			},
			urlTitle: createAnchorOpeningTag( "https://yoa.st/33v" ),
			urlCallToAction: createAnchorOpeningTag( "https://yoa.st/33w" ),
		};

		this.identifier = "singularPlural";
		this._config = merge( defaultConfig, config );
	}

	/**
	 * Runs the ranking intentions module, based on this returns an assessment
	 * result with score.
	 *
	 * @param {Paper} paper             The paper to use for the assessment.
	 * @param {Researcher} researcher   The researcher used for calling the research.
	 * @param {Jed} i18n                The object used for translations.
	 *
	 * @returns {AssessmentResult}      The result of the assessment.
	 */
	getResult( paper, researcher, i18n ) {
		const language = getLanguage( paper.getLocale() );
		const morphologyData = get( researcher.getData( "morphology" ), language, false );
		const assessmentResult = new AssessmentResult();

		// Don't calculate a result if no morphology data is available.
		if ( ! morphologyData ) {
			return assessmentResult;
		}

		// This part of the code requires morphology data to run.
		this.originalModifiedPairs = researcher.getResearch( "singularAndPlural" );
		const calculateResult = this.calculateResult( i18n );

		assessmentResult.setScore( calculateResult.score );
		assessmentResult.setText( calculateResult.text );
		assessmentResult.setHasMarks( this.determinePercentage() < 100 );

		return assessmentResult;
	}

	/**
	 * Calculates the percentage of the occurrences of the singular and plural forms in the text.
	 *
	 * @returns {number}    The percentage of the occurrences of the singular and plural forms in the text
	 * or null if there is no forms found at all in the text.
	 */
	determinePercentage() {
		const originalModifiedPairs = this.originalModifiedPairs;
		const percentages = [];
		const textHasKeyphrase = this.originalModifiedPairs.every(
			originalModifiedPair => originalModifiedPair.originalCount !== 0 || originalModifiedPair.modifiedCount !== 0
		);

		// Prevent division by zero errors.
		if ( textHasKeyphrase ) {
			for ( const originalModifiedPair of originalModifiedPairs ) {
				const originalCount = originalModifiedPair.originalCount;

				percentages.push( formatNumber(
					( originalCount * 100 ) / ( originalCount + originalModifiedPair.modifiedCount )
				) );
			}
		}

		return Math.min( ...percentages ) || null;
	}

	/**
	 * Returns the score for the ranking intention.
	 *
	 * @param {Jed} i18n     The object used for translations.
	 *
	 * @returns {Object}     The object with calculated score and resultText.
	 */
	calculateResult( i18n ) {
		const percentage = this.determinePercentage();
		const noKeyphraseOccurrences = this.originalModifiedPairs.every(
			originalModifiedPair => originalModifiedPair.originalCount === 0 && originalModifiedPair.modifiedCount === 0
		);

		// It's not possible to determine a ranking intention if the keyphrase never occurs in the text.
		if ( noKeyphraseOccurrences ) {
			return {
				score: this._config.scores.consideration,
				text: i18n.sprintf(
					/* Translators: %1$s expands to a link on yoast.com, %2$s expands to the anchor end tag. */
					i18n.dgettext(
						"js-text-analysis",
						"%1$sRanking intention%2$s: Include your keyphrase in the text so that we can check ranking intention.",
					),
					this._config.urlTitle,
					"</a>"
				),
			};
		}

		if ( percentage >= 60 ) {
			return {
				score: this._config.scores.good,
				text: i18n.sprintf(
					/* Translators: %1$s expands to a link on yoast.com, %2$s expands to the anchor end tag. */
					i18n.dgettext(
						"js-text-analysis",
						"%1$sRanking intention%2$s: Your text reflects your ranking intention. Good job!" ),
					this._config.urlTitle,
					"</a>"
				),
			};
		}

		if ( inRange( percentage, 40, 59 ) ) {
			return {
				score: this._config.scores.okay,
				text: i18n.sprintf(
					/* Translators: %1$s expands to a link on yoast.com, %2$s expands to the anchor end tag. */
					i18n.dgettext(
						"js-text-analysis",
						"%1$sRanking intention%2$s: Your text does not reflect any particular ranking intention. " +
						"If your keywords is singular, use more singular occurrences; if your keyphrase is plural, use more plural occurrences!" ),
					this._config.urlTitle,
					"</a>"
				),
			};
		}
		return {
			score: this._config.scores.bad,
			text: i18n.sprintf(
				/* Translators: %1$s and %5$s expand to a link on yoast.com, %2$s expands to the anchor end tag,
				%3$s expands to the percentage of sentences in passive voice, %4$s expands to the recommended value. */
				i18n.dgettext(
					"js-text-analysis",
					"%1$sRanking intention%2$s: Your text does not reflect your ranking intention. Change your keyphrase occurrences!" ),
				this._config.urlTitle,
				"</a>",
				this._config.urlCallToAction,
			),
		};
	}

	/**
	 * Marks modified forms of keywords in the text for the ranking intention assessment.
	 *
	 * @param {Paper} paper             The paper to use for the assessment.
	 *
	 * @returns {Array<Mark>}   Marks that should be applied.
	 */
	getMarks( paper ) {
		const wordsToMark = [];

		// Only mark if a modified form occurs in the text.
		for ( const originalModifiedPair of this.originalModifiedPairs ) {
			if ( originalModifiedPair.modifiedCount > 0 ) {
				wordsToMark.push( originalModifiedPair.modified );
			}
		}

		return markWordsInSentences( wordsToMark, getSentences( paper.getText() ), paper.locale );
	}

	/**
	 * Checks whether the paper has a text with at least 100 words and a keyword
	 * is set.
	 *
	 * @param {Paper} paper     The paper to use for the assessment.
	 *
	 * @returns {boolean}       True if applicable.
	 */
	isApplicable( paper ) {
		return paper.hasText() && paper.hasKeyword() && countWords( paper.getText() ) >= 100 && getLanguage( paper.getLocale() ) === "en";
	}
}
export default SingularPluralAssessment;