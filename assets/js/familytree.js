const firstHTML = `<div class="body genealogy-body genealogy-scroll">
<div class="genealogy-tree">
  <ul>
    <li>
      <a href="javascript:void(0);">
        <div class="member-view-box" style="padding: 0;">
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


function getImagePaths(breadcrumbs, name) {
    const firstName = name.split(' ')[0];

    const paths = {
        'jpg': `./images/family_tree/${breadcrumbs}${firstName}.jpg`.toLowerCase(),
        'webp50': `./images/family_tree/${breadcrumbs}${firstName}_50_w.webp`.toLowerCase(),
        'webp100': `./images/family_tree/${breadcrumbs}${firstName}_100_w.webp`.toLowerCase()
    }

    return paths;
}


function getNewMemberHTML(name, partner, breadcrumbs, hasChildren = false) {
    let HTMLString = "<li>";

    if (hasChildren) {
        HTMLString += `<a href="javascript:void(0);">`;
    }

    let imgPaths = getImagePaths(breadcrumbs, name);

    let imgPaddingStyle = '';
    if (!partner) {
        imgPaddingStyle = ` style="padding-right: 0;"`
    }

    HTMLString += `
    <div class="member-view-box"${imgPaddingStyle}>
    <div class="member-image">
    <img srcset="
        ${imgPaths['webp50']} 40w,
        ${imgPaths['webp100']} 50w" sizes="(max-width: 900px) 8vw, 65px"
        loading="lazy" decoding="async" src="${imgPaths['jpg']}" alt="${name}">
    `

    if (partner) {
        const partnerPaths = getImagePaths(breadcrumbs, partner);
        HTMLString += `<img srcset="
            ${partnerPaths['webp50']} 40w,
            ${partnerPaths['webp100']} 50w" sizes="(max-width: 900px) 8vw, 65px"
            loading="lazy" decoding="async" src="${partnerPaths['jpg']}" class="partner-image" alt="${partner}">`;
    }

    let nameLabel = `${name}<br>`
    if (partner) {
        nameLabel += `& ${partner}`

        if (Array.from(nameLabel).length > 40) {
            nameLabel = `${nameLabel.split(' ').join("<br>")}`
        }

    } else {
        if (Array.from(name).length > 11) {
            nameLabel = `${name.split(' ').join("<br>")}`
        }
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
    let begHTML = "";
    let endHTML = "";
    for (const [key, family] of Object.entries(tree)) {
        highest_relative = key;
        const firstName = highest_relative.split(' ')[0]

        endHTML = `</li>\n` + endHTML;


        let partner = ''
        if (family.hasOwnProperty("partner")) {
            partner = family["partner"]
        }

        if (family.hasOwnProperty("children")) {
            let subFam = family["children"][0];
            begHTML += getNewMemberHTML(highest_relative, partner, breadcrumbs, hasChildren = true);

            const [subBegHTML, subEndHTML] = parseTree(subFam, `${breadcrumbs}${firstName}/`);



            console.log(family, subBegHTML)

            begHTML += `<ul>${subBegHTML}</ul>`;
            endHTML = subEndHTML + endHTML;
        }
        else {
            begHTML += getNewMemberHTML(highest_relative, partner, breadcrumbs);
        }
    }



    return [begHTML, endHTML]
}


// read local JSON file using jQuery
$.getJSON("family_tree.json", function (tree) {
    // console.log(tree);

    const [subBegHTML, subEndHTML] = parseTree(tree)
    begHTML = firstHTML + subBegHTML;
    endHTML = subEndHTML + lastHTML;

    console.log(begHTML)
    console.log(endHTML)

    totHTML = begHTML + endHTML;
    // totHTML = totHTML.replace(/,/g, "");
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
