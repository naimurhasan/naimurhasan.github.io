const extracted_template = `
<div id="wowslider-container1">
    <div class="ws_images">
        <a v-if="newly_added" href="" target="_self"><img src="./img/wallpaper-thums/thumb_13.jpg" alt="Lighthouse" title="Lighthouse" id="wows2"/></a>
        <a href="" target="_self"><img src="./img/wallpaper-thums/thumb_01.jpg" alt="Desert" title="Desert" id="wows0"/></a>
        <a href="" target="_self"><img src="./img/wallpaper-thums/thumb_02.jpg" alt="Koala" title="Koala" id="wows1"/></a>
        <a href="" target="_self"><img src="./img/wallpaper-thums/thumb_13.jpg" alt="Lighthouse" title="Lighthouse" id="wows2"/></a>
    </div>
</div>
`;
export default Vue.component('slider-blast',{
    props: ['newly_added'],
    template: extracted_template,
    mounted: function() {
     $(this.$el).wowSlider({effect:"blast",prev:"prev",next:"next",duration:9*100,delay:30*100,outWidth:300,outHeight:200,width:300,height:200,autoPlay:true,stopOnHover:true,loop:false,bullets:0,caption:false,controls:true});
    
        console.log('animation initialized')
    }
})