/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ToneQuilla, Play sound in a filter, by Mesquilla.
 *
 * ToneQuilla is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * You should have received a copy of the GNU General Public License
 * along with ToneQuilla.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is ToneQuilla code.
 *
 * The Initial Developer of the Original Code is
 * Kent James <rkent@mesquilla.com>
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK *****
 */
(function()
{
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;

  Cu.import("resource://tonequilla/ToneQuillaPlay.jsm");
  // global scope variables
  this.tonequilla = {};

  // local shorthand for the global reference
  var that = this.tonequilla;
  
  that._initialized = false;

  that._init = function()
  {
    that.strings = document.getElementById("tonequillaStrings");
    ToneQuillaPlay.init();
    ToneQuillaPlay.window = window;

    /*
     * custom action implementations
     */

    // play sound
    (function()
    {
      that.playSound =
      {
        id: "tonequilla@mesquilla.com#playSound",
        name: that.strings.getString("extensions.tonequilla.playsound.name"),

        apply: function(aMsgHdrs, aActionValue, aListener, aType, aMsgWindow)
        {
          ToneQuillaPlay.queueToPlay(aActionValue);
        },

        isValidForType: function(type, scope) {return true;},

        validateActionValue: function(value, folder, type) { return null;},

        allowDuplicates: true
      };

    })(); // end playSound
  };

  // extension initialization

  that.onLoad = function() {
    if (that._initialized)
      return;
    that._init();
    
    var filterService = Cc["@mozilla.org/messenger/services/filters;1"]
                           .getService(Ci.nsIMsgFilterService);
    filterService.addCustomAction(that.playSound);
    that._initialized = true;
  };

  // local private functions

})();

window.addEventListener("load", function(e) { tonequilla.onLoad(e); }, false);
