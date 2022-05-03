// Add Family Tree HTML
// $("#familytreecontent").load("assets/html/familytreecontent.html")


const comp = `
<div class="tree">
	<ul>
		<li>
			<a href="#"></a>
			<ul>
				<li>
					<a href="#">Child</a>
					<ul>
						<li>
							<a href="#">Grand Child</a>
						</li>
					</ul>
				</li>
				<li>
					<a href="#">Child</a>
					<ul>
						<li><a href="#">Grand Child</a></li>
						<li>
							<a href="#">Grand Child</a>
							<ul>
								<li>
									<a href="#">Great Grand Child</a>
								</li>
								<li>
									<a href="#">Great Grand Child</a>
								</li>
								<li>
									<a href="#">Great Grand Child</a>
								</li>
							</ul>
						</li>
						<li><a href="#">Grand Child</a></li>
					</ul>
				</li>
			</ul>
		</li>
	</ul>
</div>
`

const firstHTML = `<div class="body genealogy-body genealogy-scroll">
<div class="genealogy-tree">
  <ul>
    <li>
      <a href="javascript:void(0);">
        <div class="member-view-box">
          <div class="member-image">
            <img src="https://cdn-icons.flaticon.com/png/512/4140/premium/4140037.png?token=exp=1651534723~hmac=499d998545da98be68236391d0bed767" alt="Member">
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

function getNewMemberHTML(name, partner, hasChildren = false) {
    let HTMLString = "<li>";


    if (hasChildren) {
        HTMLString += `<a href="javascript:void(0);">`;
    }

    HTMLString += `
    <div class="member-view-box">
    <div class="member-image">
    <img src="https://cdn-icons.flaticon.com/png/512/4140/premium/4140037.png?token=exp=1651534723~hmac=499d998545da98be68236391d0bed767" alt="Member">
    `

    if (partner) {
        HTMLString += `<img src="https://cdn-icons.flaticon.com/png/512/4140/premium/4140037.png?token=exp=1651534723~hmac=499d998545da98be68236391d0bed767" class="partner-image" alt="Member">`;
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


function parseTree(tree) {
    console.log("tree", tree);
    let begHTML = [];
    let endHTML = [];
    for (const [key, family] of Object.entries(tree)) {
        highest_relative = key;

        console.log(`${highest_relative} family`, family);

        endHTML.unshift(`</li>\n`);

        let partner = ''
        if (family.hasOwnProperty("partner")) {
            partner = family["partner"]
        }

        console.log("begHTML before children", begHTML)
        if (family.hasOwnProperty("children")) {
            let subFam = family["children"][0];
            begHTML.push(getNewMemberHTML(highest_relative, partner, hasChildren = true));

            console.log("subFam", subFam);
            const [subBegHTML, subEndHTML] = parseTree(subFam);



            console.log("subBegHTML", subBegHTML);

            begHTML.push(`<ul>${subBegHTML}</ul>`);
            endHTML.unshift(subEndHTML);
        }
        else {
            begHTML.push(getNewMemberHTML(highest_relative, partner));
            console.log("hi");
        }
        console.log("begHTML after children", begHTML)
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

    // for (const [key, family_dict] of Object.entries(tree)) {
    //     highest_relative = Object.keys(family_dict)[0];
    //     family = family_dict[highest_relative];

    //     begHTML.push(`<li><a href="#">${highest_relative}</a>\n`);
    //     endHTML.unshift(`</li>\n`);

    //     console.log(family);
    //     if (family.hasOwnProperty("partner")) {
    //         begHTML.push(`<a href="#">${family["partner"]}</a>\n`);
    //     }
    //     if (family.hasOwnProperty("children")) {
    //         console.log(family["children"][0]);
    //         for (const child of family["children"]) {
    //             console.log(child);
    //         }
    //     }
    //     console.log("\n");
    // }

    console.log("\n\n\n");
    console.log(begHTML);
    console.log(endHTML);

    totHTML = begHTML.join("") + endHTML.join("");
    console.log(typeof totHTML);

    totHTML = totHTML.replace(/,/g, "");
    console.log(totHTML);

    document.getElementById("familytreecontent").innerHTML = totHTML;

    familyTreeInteractions()
})


function familyTreeInteractions() {
    console.log('FAMILYTREE INTERACTIONS LOAD');
    $('.genealogy-tree ul').hide();
    $('.genealogy-tree>ul').show();
    $('.genealogy-tree ul.active').show();
    $('.genealogy-tree li').on('click', function (e) {
        console.log('hi');
        var children = $(this).find('> ul');
        if (children.is(":visible")) children.hide('fast').removeClass('active');
        else children.show('fast').addClass('active');
        e.stopPropagation();
    });
};
