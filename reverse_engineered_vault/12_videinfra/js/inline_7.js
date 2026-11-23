<% if (videoId) { %>
                <div
                    data-plugin="videoEmbed"
                    data-video-embed-id="<%- videoId %>"
                    data-video-embed-controls="true"
                    data-video-embed-type="<%- videoType %>"
                    data-video-embed-autoplay="true"
                    data-video-embed-loop="true"
                    class="video-embed video-embed--initial-ratio"
                >

                            
                                                                    
            
            
                    
    <span
        class="btn video-embed__play btn--circle-sm btn--secondary btn--start btn--large-circle is-hidden--hover is-decorative btn--animated-content"
                                    data-plugin=" button"
                            data-button-clone-content="true"
                                    >
        <span class="btn__inner">
            <span class="btn__content">
                
                                    <span class="btn__text ">Play</span>
                
                
                            </span>
        </span>
    </span>


                    <div class="video-embed__pannel js-video-embed-panel js-cursor-hidden-spot">

                        <div class="js-video-progress-bar-place group__fill"></div>

                                                <div class="video-embed__mute is-hidden--sm-down">
                                    
                                                                    
            
            
                    
    <a
        class="btn btn--secondary btn--sound js-video-embed-mute btn--animated-content"
                                                                                                                                            aria-label="Volume"
                            data-plugin=" button"
                            data-button-clone-content="true"
                                    tabindex="0"
                            role="button"
            >
        <span class="btn__inner">
            <span class="btn__content">
                
                                    <span class="btn__text ">Sound</span>
                
                
                            </span>
        </span>
    </a>

                        </div>
                    </div>
                </div>
            <% } %>