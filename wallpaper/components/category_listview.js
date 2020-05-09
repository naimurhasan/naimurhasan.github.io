const extracted_template = `
<nav class="navbar-expand-md navbar-dark">
              <div class="d-flex justify-content-between">
                <h4>Categories</h4>
                <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#categoryNavbar" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                  <span class="navbar-toggler-icon"></span>
                </button>
              </div>

              <div class="collapse navbar-collapse" id="categoryNavbar">
                <ul class="list-group list-group-flush">
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Nature</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_05.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Movie</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_06.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Games</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_07.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Cars</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_08.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Bikes</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_09.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Music</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_10.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Flowers</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_11.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Occations</span>
                      <div class="preview"><img src="/img/wallpaper-thums/thumb_12.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Abstract</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_03.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>3D</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_14.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Airway</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_15.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Animals</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_16.jpg"></div>
                    </a></li>
                  <li class="list-group-item"><a href="/pages/nature.html" class="nav-animated-item"><span>Animation</span>
                      <div class="preview"><img src="/wallpaper/img/wallpaper-thums/thumb_17.jpg"></div>
                    </a></li>
                </ul>
              </div>
            </nav>
`;
export default Vue.component('category_listview',{
    props: [''],
    template: extracted_template,
    mounted: function() {
        console.log('categories initialized')
    }
})