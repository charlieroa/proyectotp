class LeftbarComponent extends HTMLElement {
  connectedCallback() {
    this.outerHTML = `<div class="app-sidenav">

            <!-- Brand Logo -->
            <div class="logo-box">
                <!-- Brand Logo Light -->
                <a href="index.html" class="">
                    <img src="assets/images/logo-light.png" alt="logo" class="logo-lg">
                    <img src="assets/images/logo-sm.png" alt="small logo" class="logo-sm">
                </a>
            </div>

            <!--- Menu -->
            <div class="h-100" data-simplebar>
                <ul class="menu">
                    <li class="menu-item">
                        <a href="index.html" class="menu-link">
                            <i class="uil-panorama-h-alt"></i>
                            <span> Preview </span>
                        </a>
                    </li>

                    <li class="menu-item">
                        <a href="shots-gallery.html" class="menu-link">
                            <i class="uil-image-v"></i>
                            <span> Gallery </span>
                        </a>
                    </li>


                    <li class="side-nav-title menu-link">UI Kit</li>


                    <li class="menu-item">
                        <a href="index.html" class="menu-link active">
                            <i class="uil-sign-right"></i>
                            <span> Getting-Started </span>
                        </a>
                    </li>


                    <li class="menu-item">
                        <a href="pre-requisite.html" class="menu-link">
                            <i class="uil-focus-add"></i>
                            <span> Pre-requisite </span>
                        </a>
                    </li>

                    <li class="menu-item">
                        <a href="how-to-run.html" class="menu-link">
                            <i class="uil-file-edit-alt"></i>
                            <span> How to Run </span>
                        </a>
                    </li>


                    <li class="side-nav-title menu-link">Customization</li>


                    <li class="menu-item">
                        <a href="configuration.html" class="menu-link">
                            <i class="uil-file-edit-alt"></i>
                            <span> Configuration </span>
                        </a>
                    </li>

                    <li class="menu-item">
                        <a href="theme.html" class="menu-link">
                            <i class="uil-brightness"></i>
                            <span> Theme </span>
                        </a>
                    </li>



                    <li class="menu-item">
                        <a href="language.html" class="menu-link">
                            <i class="uil-globe"></i>
                            <span> Language </span>
                        </a>
                    </li>


                    <li class="side-nav-title menu-link">How to add</li>


                    <li class="menu-item">
                        <a href="state-management.html" class="menu-link">
                            <i class="uil-file-plus-alt"></i>
                            <span> State Management </span>
                        </a>
                    </li>


                    <li class="menu-item">
                        <a href="add_full_app.html" class="menu-link">
                            <i class="uil-box"></i>
                            <span>  Full App </span>
                        </a>
                    </li>


                    <li class="menu-item">
                        <a href="widgets.html" class="menu-link">
                            <i class="uil-polygon"></i>
                            <span> Widgets </span>
                        </a>
                    </li>


                    <li class="side-nav-title menu-link">Others</li>


                    <li class="menu-item">
                        <a href="changelogs.html" class="menu-link">
                            <i class="uil-file-upload-alt"></i>
                            <span> Changelogs </span>
                        </a>
                    </li>


                    <li class="menu-item">
                        <a href="questions.html" class="menu-link">
                            <i class="uil-comments-alt"></i>
                            <span> Questions </span>
                        </a>
                    </li>

                </ul>
                <!--- End Menu -->
                <div class="clearfix"></div>
            </div>
        </div>`;
  }
}

class TopbarComponent extends HTMLElement {
  connectedCallback() {
    this.outerHTML = `  <div class="navbar-custom">
                <div class="topbar px-2">
                    <div class="topbar-menu d-flex align-items-center gap-lg-2 gap-1">
                        <!-- Sidebar Menu Toggle Button -->
                        <button class="button-toggle-menu">
                            <i data-feather="menu"></i>
                        </button>
                    </div>

                    <ul class="topbar-menu d-flex align-items-center gap-3">

                        <li class="d-none d-md-inline-block">
                            <span class="nav-link">
                                <span class="badge bg-danger font-16"> v17.x</span>
                            </span>
                        </li>
                    </ul>
                </div>
            </div>`;
  }
}

customElements.define("x-leftbar", LeftbarComponent);
customElements.define("x-topbar", TopbarComponent);
