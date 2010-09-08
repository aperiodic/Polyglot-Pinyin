/**
 * Polyglot Chrome Extension
 *
 * @version 0.8
 * @license GNU Lesser General Public License, http://www.gnu.org/copyleft/lesser.html
 * @created 2010-02-16
 * @updated 2010-02-25
 */


function trim(str) 
{
  return str.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
}

//We can't access the google API and settings directly, so 
//we need to use a persistent connection to the background page
//for that stuff
var lock = 0;
const EXTENSION_ID = "plpjkjplknknmhfhkjgcfgofclmlnine";

//Lookup table containing words and where they appear.  Used to keep
//this information in the state between the call to the translate API and
//its response

//We don't want none of them newfangled big fancy words.  Also keeps out
//weird chains of javascript and formatting characters and stuff
const MAXIMUM_LENGTH = 64;

var method_list = [translate, untranslate, toggleEnabled, processTranslation, scanNode, pickWords, prepareSpan, markForTranslation];



//Constructor function
function Polyglot(settings, port) 
{
    this.settings = settings;
    this.port = port;
    //Each word is uniquely identified by an index number.  word_list[5] is
    //a list of all the DOM nodes that might contain a replacement-worthy instance
    //of word 5
    this.word_list = [];
    this.node_lookup = [];
    this.word_lookup = {};
    this.span_id_suffix = 0;
    for (var i in method_list) {
        this[method_list[i].name] = method_list[i];
    }
    if (this.settings.enabled == 1)
    {
      this.translate();
    }
}

function toggleEnabled(msg)
{
    if (msg["toggle_enabled"] == undefined) 
    {
      return;
    }
    this.settings.enabled = (this.settings.enabled != 1);
    if (this.settings.enabled == 1) {
	this.translate();
    }
    else {
      this.untranslate();
    }
}

function translate()
{
    this.scanNode(document.body);
    if (this.word_list.length > 0) {
      this.port.postMessage({text: this.word_list});
    } 
}


function untranslate(msg) 
{
  var e;
  this.word_list = [];
  this.word_lookup = {};
  this.node_lookup = [];

  for (var i = this.span_id_suffix - 1; i >=0; i--) {
    e = document.getElementById(EXTENSION_ID + i);
    if (e != null) {
      e.outerHTML = e.title;
    }
  }
  this.span_id_suffix = 0;
}



function markForTranslation(word, e_node_index)
{
      if (this.word_lookup[word] === undefined) {
         this.word_lookup[word] = [e_node_index];
         this.word_list.push(word);
      }
      else {
         this.word_lookup[word].push(e_node_index);
      }
}

function pickWords(word_text, e_node_index)
{
  node_word_list = word_text.split(" ");
  var probability = this.settings["probability"];
  var phrase = "";
  var joining_short = false;
  for (var word_iterator in node_word_list) {
      
    random_number = Math.random() * probability;
    word = node_word_list[word_iterator];

    word_length = word.length;
    if ((word_length <= MAXIMUM_LENGTH)  && (random_number < 1) && ((word_length >= this.settings["minimum_length"]) || (this.settings["join_short"] == 1))) {
      if ((this.settings["join_short"] == 1) && (word_length < this.settings["minimum_length"]))
      {
        joining_short = true;
	probability = 1;
      }
      else {
        probability = this.settings["joined_probability"];
      }
      if ((this.settings["join_adjacent"] == 1) || joining_short) {
        phrase += " ";
        phrase += word;
        if ((this.settings["join_adjacent"] == 0) && (word_length >= this.settings["minimum_length"])) {
          joining_short = false;
          phrase = trim(phrase);
          this.markForTranslation(phrase, e_node_index);
	  phrase = "";
        }
      }    
      else
      {
        this.markForTranslation(word, e_node_index);
        joining_short = false;
      }

    }
    else
    {
      phrase = trim(phrase);
      if (phrase.length > 0) {
        this.markForTranslation(phrase, e_node_index);
        joining_short = false;
	phrase = "";
      }
      probability = this.settings["probability"];
    }
  }
  phrase = trim(phrase);
  if (phrase.length > 0) {
    this.markForTranslation(phrase, e_node_index);
  }
}

function scanNode(e) 
{
    var i = 0;
    var chosen_words;
    var randomnumber;
    var word;
    var childNodes = e.childNodes;
    var e_node_index = 0;
    var word;
    //This is used to keep track of where we are in the node's text
    //Make sure this is a node with text in it
    if (e.type == "textarea" || (e.tagName && e.tagName.toUpperCase() == "SCRIPT") || (e.tagName && e.tagName.toUpperCase() == "STYLE" )){
      return e.nodeValue;
    }

    if ((e.nodeType == 3) && e.nodeValue && (trim(e.nodeValue) != "")) {
        e_node_index = this.node_lookup.push([e]) - 1;
        //Separate out individual words
        this.pickWords(e.nodeValue, e_node_index);
    }
    //Recursively apply to each child
    for (i = 0; i < childNodes.length; i++) {	
      this.scanNode(childNodes[i]);
    }
    return e.nodeValue;
}



function prepareSpan(range, word, translation)
{
    startContainer = range.startContainer;
    spanNode = startContainer.ownerDocument.createElement("span");

    spanNode.title = word;
    if (this.settings.color_translated == 1) {
      spanNode.style.color = "#" + this.settings.translation_color;
    }
    spanNode.innerHTML = translation;
    if (this.settings.parenthesize_original == 1) {
      spanNode.innerHTML += "(" + word +")";
    }
    spanNode.id = EXTENSION_ID + this.span_id_suffix;
    this.span_id_suffix++;
    return spanNode;
}



function sameWord(first_word, second_word)
{
  if ((first_word.toLowerCase != undefined) && (second_word.toLowerCase != undefined)) {
    return first_word.toLowerCase() == second_word.toLowerCase();
  }

  else 
  {
    return first_word == second_word;
  }
}

//Receives a message containing a list of words and translations 
//from background.html, updates the DOM accordingly
function processTranslation(msg)
{
    if (msg.probability || msg.toggleEnabled)
    {
      return;
    }
    var translation;
    var offset;
    var range;
    var startContainer;
    var spanNode;
    var lookup_entry;
    var e;
    var node_equivalents;
    var nodes_containing;
    //Iterate through all the words
    for (var pair in msg) {
      translation = msg[pair].translation;
      word = msg[pair].word;
      if (translation && (!sameWord(word, translation) || (this.settings.color_changed_only == 0))) {


      //Sometimes Google will capitalize a word for no reason.  Undo this.
	  if ((translation.toLowerCase != undefined) && (word.toLowercase != undefined) && word == word.toLowerCase())
      {
        translation = translation.toLowerCase();
      }
      range = document.createRange();
      range.collapse(false);
      nodes_containing = this.word_lookup[word];
      for (var node_id in nodes_containing) {
        node_equivalents = this.node_lookup[nodes_containing[node_id]];
        //Iterate through each node we might want to replace this word in
        for (var node_index in node_equivalents) {
          e = node_equivalents[node_index];
          range.selectNode(e);
          //Look for the word
          offset = (" " + range.toString() + " ").indexOf(" " + word + " ");
          if (offset != -1)
          {
            range.setStart(e, offset);
            range.setEnd(e, offset + word.length);

            //Get rid of the original word
	    range.deleteContents();
            //And make a span with the new one
            range.collapse(true);
	    spanNode = this.prepareSpan(range, word, translation);
	    range.insertNode(spanNode);
            this.node_lookup[nodes_containing[node_id]].push(spanNode.nextSibling);
          }
        }
      }
    }
  }
}


//Process a message containing user settings
//And then trigger the translation function
function initialize(msg, port)
{
  if (msg.probability) {
    var polyglot_object = new Polyglot(msg, port);
    port.onMessage.addListener(function(msg) {polyglot_object.processTranslation(msg);});  
    port.onMessage.addListener(function(msg) {polyglot_object.toggleEnabled(msg);});  

    page_language = document.getElementsByTagName('html')[0].getAttribute('xml:lang');
    if ((page_language !== null) && (page_language.substr(0,2) != msg.starting_language)) {
      return;
    }
  }
}


var port = chrome.extension.connect({name: "trans"});
port.onMessage.addListener(function(msg) {initialize(msg, port)});
port.postMessage({});