import { take } from "lodash-es";
import countWords from "../../helpers/word/countWords";
import {
	collapseProminentWordsOnStem,
	filterProminentWords,
	getProminentWords,
	getProminentWordsFromPaperAttributes,
	retrieveAbbreviations,
	sortProminentWords,
} from "../../helpers/prominentWords/determineProminentWords";
import { getSubheadingsTopLevel, removeSubheadingsTopLevel } from "../../helpers/html/getSubheadings";

let functionWords = [];

/**
 * Retrieves the prominent words from the given paper.
 *
 * @param {Paper}       paper       The paper to determine the prominent words of.
 * @param {Researcher}  researcher  The researcher to use for analysis.
 * @param {Function} stemmer     The available stemmer function of a language.
 * @param {Array}   funcWords       The available function words.
 * @param {Object}  morphologyData  The available morphology data file.
 *
 * @returns {Object}          result                    A compound result object.
 * @returns {ProminentWord[]} result.prominentWords     Prominent words for this paper, filtered and sorted.
 * @returns {boolean}         result.hasMetaDescription Whether the metadescription is available in the input paper.
 * @returns {boolean}         result.hasTitle           Whether the title is available in the input paper.
 */
function getProminentWordsForInternalLinking( paper, researcher, stemmer, funcWords, morphologyData ) {
	functionWords = funcWords;
	const text = paper.getText();
	const metadescription = paper.getDescription();
	const title = paper.getTitle();

	const result = {};
	result.hasMetaDescription = metadescription !== "";
	result.hasTitle = title !== "";
	result.prominentWords = [];

	/**
	 * We only want to return suggestions (and spend time calculating prominent words) if the text is at least 100 words.
 	 */
	const textLength = countWords( text );
	if ( textLength < 100 ) {
		return result;
	}

	const subheadings = getSubheadingsTopLevel( text ).map( subheading => subheading[ 2 ] );
	const attributes = [
		paper.getKeyword(),
		paper.getSynonyms(),
		title,
		metadescription,
		subheadings.join( " " ),
	];

	const abbreviations = retrieveAbbreviations( text.concat( attributes.join( " " ) ) );

	const prominentWordsFromText = getProminentWords( removeSubheadingsTopLevel( text ), abbreviations, stemmer, functionWords, morphologyData  );

	const prominentWordsFromPaperAttributes = getProminentWordsFromPaperAttributes(
		attributes, abbreviations, stemmer, functionWords, morphologyData );

	/*
	 * If a word is used in any of the attributes, its weight is automatically high.
	 * To make sure the word survives weight filters and gets saved in the database, make the number of occurrences times-3.
	 */
	prominentWordsFromPaperAttributes.forEach( relevantWord => relevantWord.setOccurrences( relevantWord.getOccurrences() * 3 ) );

	const collapsedWords = collapseProminentWordsOnStem( prominentWordsFromPaperAttributes.concat( prominentWordsFromText ) );
	sortProminentWords( collapsedWords );

	/*
	 * If morphology data are available for a language, the minimum number of occurrences to consider a word to be prominent is 4.
	 * This minimum number was chosen in order to avoid premature suggestions of words from the paper attributes.
	 * These get a times-3 boost and would therefore be prominent with just 1 occurrence.
	 *
	 * If morphology data are not available, and therefore word forms are not recognized, the minimum threshold is lowered to 2.
	 */
	let minimumNumberOfOccurrences = 4;

	if ( ! morphologyData ) {
		minimumNumberOfOccurrences = 2;
	}

	/*
	 * Return the 100 top items from the collapsed and sorted list. The number is picked deliberately to prevent larger
	 * articles from getting too long of lists.
	 */
	result.prominentWords = take( filterProminentWords( collapsedWords, minimumNumberOfOccurrences ), 100 );

	return result;
}

export default getProminentWordsForInternalLinking;
