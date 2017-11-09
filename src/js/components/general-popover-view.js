/*
 * Unsplash settings
 */

const generalPopoverView = () => `
  <section id="general-settings" class="general-settings">
    
    <button id="show-default-tab" class="show-default-tab"
      aria-label="Open Default Tab">
      Open Default Tab
    </button>
    
    <button id="show-chrome-apps" class="show-chrome-apps" 
      aria-label="Show Chrome Apps">
      Show Apps
    </button>
    
    <form id="unsplash-collections" class="unsplash-collections">
      <span class="label">Load photos from multiple 
        <a href="https://unsplash.com/collections/">Unsplash collections</a> 
        by adding their IDs below separated by commas:</span>
        
        <input type="text" name="unsplash-collections__input" 
          class="unsplash-collections__input" id="unsplash-collections__input" 
          value="" placeholder="Collection IDs"/> 
        
        <br>

        <button type="submit" class="update-collections ladda-button" 
          data-spinner-color="#ffffff" 
          data-style="expand-right">
          <span class="ladda-label">Save Collections</span>
        </button>
    </form>

    <section>
      <span class="label">
        How often would you like new photos to be loaded?
      </span>

      <select id="select-photo-frequency" 
        class="select-photo-frequency" name="photo-frequency">
        <option value="newtab">On every new tab (default)</option>
        <option value="everyhour">Every hour</option>
        <option value="everyday">Once a day</option>
      </select>

      <button id="save-photo-frequency">Save</button>
    </section>


  </section>
`;

export default generalPopoverView;
