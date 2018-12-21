/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of the application ToneQuilla by Mesquilla.
 *
 * This application is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * You should have received a copy of the GNU General Public License
 * along with this application.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mesquilla code.
 *
 * The Initial Developer of the Original Code is
 * Kent James <rkent@mesquilla.com>
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK *****
 */

var EXPORTED_SYMBOLS = ["ToneQuillaPlay"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

// support variables for playing sound
const kDelayToNext = 5000;
const kDelayToClear = 15000;
const kStatusIdle = 0; // not playing anything
const kStatusStart = 1;

function re(e)
{
  dump(e + '\n');
  Cu.reportError(e);
  throw e;
}

var ToneQuillaPlay = {

  // nsISound instance to play .wav files
  _nsISound: null,

  // queue of file references for sounds to play
  _playQueue: [],

  // queue of already queued file references to ignore
  _ignoreQueue: [],

  // status of player
  _status: kStatusIdle,

  // timer to control delay between play requests
  _playTimer: null,

  // timer to control delay to clear ignore queue
  _ignoreTimer: null,

  // nsIIOService
  _nsIIOService: null,

  // nsIMIMEService
  _nsIMIMEService: null,

  // active audio element
  _audioElement: null,

  // the window used to construct the Audio object
  window: null,

  // nsIFile for the sounds directory
  soundsDirectory: null,

  MY_ID: "tonequilla@mesquilla.com",

  //function to initialize variables
  init: function ToneQuillaPlay_init()
  { try {
    that._playTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    that._ignoreTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    that._nsIIOService = Cc["@mozilla.org/network/io-service;1"]
                            .getService(Ci.nsIIOService);
    that._nsISound = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
    that._nsIMIMEService = Cc["@mozilla.org/mime;1"]
                              .getService(Ci.nsIMIMEService);
    // pre-Moz2
    if (Cc["@mozilla.org/extensions/manager;1"])
    {
      nsIExtensionManager = Cc["@mozilla.org/extensions/manager;1"]
                              .getService(Ci.nsIExtensionManager);
      that.soundsDirectory =
        nsIExtensionManager.getInstallLocation(that.MY_ID)
                           .getItemFile(that.MY_ID, "sounds");
    }
    else // Moz2
    {
      Cu.import("resource://gre/modules/AddonManager.jsm");

      AddonManager.getAddonByID(that.MY_ID,
        function (aAddon)
        { try {
          let install = aAddon.getResourceURI("install.rdf")
                              .QueryInterface(Ci.nsIFileURL)
                              .file;
          let files = install.parent.directoryEntries;
          while (files.hasMoreElements())
          {
            let f = files.getNext().QueryInterface(Ci.nsIFile);
            if (f.leafName == 'sounds')
            {
              that.soundsDirectory = f;
              break;
            }
          }
          if (!that.soundsDirectory)
            throw 'sounds directory not found';
        } catch (e) {re(e);}}
      )
    }
  } catch (e) {re(e);}},

  // function to play the next queued sound
  _nextSound: function ToneQuillaPlay_nextSound()
  {
    let soundSpec;
    if (soundSpec = that._playQueue.shift())
    {
      that._status = kStatusStart;
      that._playTimer.initWithCallback(that._nextSound,
                                       kDelayToNext,
                                       Ci.nsITimer.TYPE_ONE_SHOT);
      that.play(soundSpec);
    }
    else
    {
      that._ignoreTimer.initWithCallback(that._clearIgnore,
                                         kDelayToClear,
                                         Ci.nsITimer.TYPE_ONE_SHOT);
      that._status = kStatusIdle;
    }
  },

  play: function ToneQuillaPlay_play(aSpec)
  {
    let playSpec = aSpec;
    // initialize module if needed
    if (!that._playTimer)
      that.init();

    let dotIndex = aSpec.lastIndexOf(".");
    let extension = "";
    if (dotIndex >= 0)
      extension = aSpec.substr(dotIndex + 1).toLowerCase();
    let mimeType = "";
    if (extension == "wav") {
      mimeType = "audio/wav";
    }
    else {
      try {
        mimeType = that._nsIMIMEService.getTypeFromExtension(extension);
      }
      catch (e) {}  // ignore errors, since that probably means not defined
    }

    let nsIFileURL = that._nsIIOService
                         .newURI(aSpec, null, null)
                         .QueryInterface(Ci.nsIFileURL);

    // If the profile gets moved, then the file URL will no longer
    //  be valid. Fix that at least for our shipped files by
    //  also checking the default location.
    if (!nsIFileURL.file.exists())
    {
      let directory = that.soundsDirectory;
      let newURL = that._nsIIOService.newFileURI(directory)
                       .QueryInterface(Ci.nsIURL);
      newURL.fileName = nsIFileURL.QueryInterface(Ci.nsIURL).fileName;
      playSpec = newURL.QueryInterface(Ci.nsIURI).spec;
      nsIFileURL = that._nsIIOService
                       .newURI(playSpec, null, null)
                       .QueryInterface(Ci.nsIFileURL);
      if (!nsIFileURL.file.exists()) {
        Cu.reportError("ToneQuilla file to play " + aSpec + " does not exist");
        return;
      }
    }

    // Macs can use nsISound to play aiff files
    if (that.window.navigator.platform.indexOf("Mac") >= 0 && mimeType == "audio/aiff")
      mimeType = "audio/wav";

    switch (mimeType)
    {
      case "video/ogg":
      case "audio/ogg":
        that._audioElement = new that.window.Audio(playSpec);
        that._audioElement.autoplay = true;
        that._audioElement.load();
        break;
      case "audio/wav":
      case "audio/x-wav":
        let url = that._nsIIOService
                      .newURI(playSpec, null, null)
                      .QueryInterface(Ci.nsIURL);
        that._nsISound.play(url);
        break;
      default:
        // We're going to blindly let the OS handle this
        nsIFileURL.file
                  .QueryInterface(Ci.nsILocalFile)
                  .launch();
    }
  },

  // clear all file references from the ignore queue
  _clearIgnore: function ToneQuillaPlay_clearIgnore()
  {
    while (that._ignoreQueue.pop())
      ;
  },

  // add a file URL spec to the play queue, unless already queued or ignored
  queueToPlay: function ToneQuillaPlay_queueToPlay(aSpec)
  {
    // This function is designed to allow multiple emails to request playing
    // a sound, without getting the same sound multiple times, nor overlapping.
    // Multiple sounds are delayed to allow each to be heard. Any sounds
    // that recur during an ignore period are ignored.

    // initialize module if needed
    if (!that._playTimer)
      that.init();

    // ignore recently queued sounds
    if (that._ignoreQueue.indexOf(aSpec) >= 0)
    {
      return;
    }

    let urlIndex = that._playQueue.indexOf(aSpec);
    if (urlIndex < 0)
    {
      that._playQueue.push(aSpec);
      that._ignoreQueue.push(aSpec);
    }

    if (that._status == kStatusIdle)
    {
      that._status = kStatusStart;
      that._nextSound();
    }
  },
}

// shorthand notation for the current module
var that = ToneQuillaPlay;
that.name = "ToneQuillaPlay";
