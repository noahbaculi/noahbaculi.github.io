const firstHTML = `<div class="body genealogy-body genealogy-scroll">
<div class="genealogy-tree">
  <ul>
    <li>
      <a href="javascript:void(0);">
        <div class="member-view-box">
          <div class="member-image">
            <img src="./images/family_tree/family.png" style="background-color: white;" alt="Family">
            <div class="member-details">
              <h3></h3>
            </div>
          </div>
        </div>
      </a>
      <ul class="active">
`

const lastHTML = `
</ul>
</li>
</ul>
</div>
</div>
`


function LinkCheck(url) {
    var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    return http.status != 404;
}


function getImagePath(breadcrumbs, name) {
    const firstName = name.split(' ')[0];
    let imgPath = `./images/family_tree/${breadcrumbs}/${firstName}.jpg`.toLowerCase().replace("//", "/");

    if (!LinkCheck(imgPath)) { imgPath = `./images/family_tree/person.png` };

    return imgPath;
}


function getNewMemberHTML(name, partner, breadcrumbs, hasChildren = false) {
    let HTMLString = "<li>";

    if (hasChildren) {
        HTMLString += `<a href="javascript:void(0);">`;
    }

    let imgPath = getImagePath(breadcrumbs, name);

    let imgPaddingStyle = '';
    if (!partner) {
        imgPaddingStyle=` style="padding-right: 0;"`
    }

    HTMLString += `
    <div class="member-view-box"${imgPaddingStyle}>
    <div class="member-image">
    <img src="${imgPath}" alt="${name}">
    `

    if (partner) {
        const partnerPath = getImagePath(breadcrumbs, partner);
        HTMLString += `<img src="${partnerPath}" class="partner-image" alt="${partner}">`;
    }

    let nameLabel = `${name}<br>`
    if (partner) {
        nameLabel += `& ${partner}`
    }

    HTMLString += `
    <div class="member-details">
    <h3>
    <i>${nameLabel}</i>
    </h3>
    </div>
    </div>
    </div>
    `;

    if (hasChildren) {
        HTMLString += `</a>`;
    }

    return HTMLString
}


function parseTree(tree, breadcrumbs = '') {
    // console.log("tree", tree);
    let begHTML = [];
    let endHTML = [];
    for (const [key, family] of Object.entries(tree)) {
        highest_relative = key;
        const firstName = highest_relative.split(' ')[0]

        endHTML.unshift(`</li>\n`);

        let partner = ''
        if (family.hasOwnProperty("partner")) {
            partner = family["partner"]
        }

        if (family.hasOwnProperty("children")) {
            let subFam = family["children"][0];
            begHTML.push(getNewMemberHTML(highest_relative, partner, breadcrumbs, hasChildren = true));

            const [subBegHTML, subEndHTML] = parseTree(subFam, `${breadcrumbs}/${firstName}`);
            begHTML.push(`<ul>${subBegHTML}</ul>`);
            endHTML.unshift(subEndHTML);
        }
        else {
            begHTML.push(getNewMemberHTML(highest_relative, partner, breadcrumbs));
        }
    }
    return [begHTML, endHTML]
}


// read local JSON file using jQuery
$.getJSON("family_tree.json", function (tree) {
    // console.log(tree);
    let begHTML = [firstHTML];
    let endHTML = [lastHTML];

    const [subBegHTML, subEndHTML] = parseTree(tree)
    begHTML.push(subBegHTML);
    endHTML.unshift(subEndHTML);

    totHTML = begHTML.join("") + endHTML.join("");
    totHTML = totHTML.replace(/,/g, "");
    document.getElementById("familytreecontent").innerHTML = totHTML;

    familyTreeInteractions()
})


function familyTreeInteractions() {
    $('.genealogy-tree ul').hide();
    $('.genealogy-tree>ul').show();
    $('.genealogy-tree ul.active').show();
    $('.genealogy-tree li').on('click', function (event) {
        var children = $(this).find('> ul');
        if (children.is(":visible")) children.hide('fast').removeClass('active');
        else children.show('fast').addClass('active');
        event.stopPropagation();
    });
};
