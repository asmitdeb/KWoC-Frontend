import React, { useState, useEffect }from 'react';
import Tags from '../data/tags.js';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select'
import axios from 'axios'
import { BACKEND_URL } from '../constants/constants'
import Navbar from './Navbar'
import '../styles/Form.scss';
import '../styles/css-fontello-github-circled/fontello.css';
import '../styles/css-fontello-mail-alt/fontello.css';

const options = Tags.map(item => { return {'value': item, 'label': item} })

 /**
  * Makes a regex check to know if link is a valid URL or not
  * @param {string} link - link entered by user
  * @return {bool} - true if a valid URL, false if not
 */
 function checkLink(link) {
 const  pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
 '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
 '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
 '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
 '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
 '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(link);
}



export default function Form(props) {

  const [isSubmitDisabled, disableSubmit] = useState(false)

  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [repolink, setRepolink] = useState('')
  const [channelLink, setChannelLink] = useState('')
  const [tags, setTags] = useState([])
  const [autoTags, setAutoTags] = useState([])
  const [mentorRepos, setMentorRepos] = useState([])
  const [showTags, setShowTags] = useState(false)
  const [readme, setReadme] = useState(``)

  const [showBranches, setShowBranches] = useState(false)
  const [branchOpts, setBranchOpts] = useState([])
  const [branch, setBranch] = useState('')

  const [showButtonAndOthers, setShowButtonAndOthers] = useState(false)

  const [errInRepo, setErrInRepo] = useState('')
  const [errInLink, setErrInLink] = useState('')


  useEffect(() => {

    if(localStorage.getItem('mentor_jwt') === null || localStorage.getItem('mentor_jwt') === undefined)
      props.history.push('/')

    
    // fetch all the projects of mentor
    const username = localStorage.getItem('mentor_username')
    // const username = 'xypnox' // this line only for testing, uncomment above line & comment this line in production, and coment this line
    axios
    .get(`https://api.github.com/users/${username}/repos?per_page=100`)
    .then(res => {
      const repos = res.data.map(item => {
        return { 'name': item.full_name, 'value': item.html_url, 'label': item.full_name.split('/')[1] }
      })
      setMentorRepos(repos)
    })
    .catch(err => {

    })
  }, [])

  /**
   * To check if there are minimum of 2 issues in repo and README is of a minimum size(in direct check for a descriptive README)
   * If the above checks are failed, shows errors accordingly 
   * If the above checks are passed, it calls functions which autofill Tags and branches
   * @param {string} repolink - Link of the Github repo in format of https://github.com/OWNERNAME/REPONAME
  */
  async function checkIssuesAndReadme(repolink) {
    let message = ''


    // remove the last trailing slash, if it exists
    if (repolink.slice(-1) === "/") {
      repolink = repolink.slice(0,-1)
    }
    
    const splitArr = repolink.split("/")
    const len = splitArr.length
    
    const repoName = splitArr[len-1]
    const ownerName = splitArr[len-2]


    // check for minimum number of issues, along with valid URL or not
    const issuesURL = `https://api.github.com/repos/${ownerName}/${repoName}/issues?q=state:open`
    try {
      const res = await axios.get(issuesURL)
      const issues = res.data.filter(item => !item.hasOwnProperty('pull_request'))
      const numOfIssues = issues.length
      if(numOfIssues < 2)
        message = `Repo has only ${numOfIssues} issues, Please maintain atleast 2 issues. `
    }
    catch(err) {
      message = `The link should be in format of https://github.com/USERNAME/REPO. Please add a valid Github link repo with atleast 2 open issues. `
    }

    // check for a minimum size of README
    const readmeURL = `https://api.github.com/repos/${ownerName}/${repoName}/readme`
    try {
      const res = await axios.get(readmeURL)
      if(res.data.size < 100)
      message += `Please add a more descriptive modified README. It is too short`
    }
    catch(err) {
      message += `Please add a descriptive README.md`
    }

    // show error, if any
    setErrInRepo(message)

    // if no error, the fill the tags and show the branch fields along with other fields
    if (message === '') {
      autofillTags(`${ownerName}/${repoName}`)
      showBranchField(`${ownerName}/${repoName}`)
      setShowButtonAndOthers(true)
      return
    }
  }

  
  /**
   * Makes a request to Github API to fetch all the branches of the repo and shows the field to select branch 
   * @param {string} repo - ownername/reponame format string 
   */
  async function showBranchField(repo) {
    const endpoint = `https://api.github.com/repos/${repo}/branches`
    const res = await axios.get(endpoint)
    const branches_opts = res.data.map(item => {
      return { 'value': item['name'], 'label': item['name'] }
    })
    setBranchOpts(branches_opts)
    setBranch(branches_opts[0]['value']) // setting the first as the default selected branch
    setShowBranches(true)
  }

  /**
   * Makes request to Github API and fetches languages and topics, 
   * Shows the tags field
   * Auto Fills the tags with the languages and topics fetched
   * @param {string} repo - ownername/reponame format string
  */
  async function autofillTags(repo) {
    const endpoint_for_languages = `https://api.github.com/repos/${repo}/languages` // working
    const endpoint_for_topics = `https://api.github.com/repos/${repo}/topics` // testing
    const headers = {
      "Accept": " application/vnd.github.mercy-preview+json", 
      // these headers are required until /topics endpoint of Gituhb API is in preview mode
      // can be removed later, once Github makes it available openly
    }
    
    const req1 =  axios.get(endpoint_for_topics,{ headers: headers })
    const req2 = axios.get(endpoint_for_languages)
  
  // Makes both the axios request concurrently
  await axios
    .all([req1, req2])
    .then(axios.spread((...res) => {
      const res1 = res[0]
      const res2 = res[1]
    
      let tags = new Set()
      res1.data["names"].forEach(tag => {
        tags.add(tag.toLowerCase())
      })
  
      Object.keys(res2.data).forEach(tag => {
        tags.add(tag.toLowerCase())
      })
  
      const autotags_arr = [...tags]
      const autotags_for_select =  autotags_arr.map(tag => { return {'value': tag, 'label': tag} })
      setAutoTags(autotags_for_select)
      setTags(autotags_arr)
      setShowTags(true)
    }))
    .catch(err => {
      console.log('error ',err)
      alert('Unable to Fetch Topics and Languages')
    })
  }

  function handleChangeTagsField(tags, action) {
    const selectedTags = tags.map(item => item.value)
    setTags(selectedTags)
  }

  function handleChangeBranchField(tag, action) {
    if(tag != null) {
      const selectedBranch = tag.value
      setBranch(selectedBranch)
    }
  }

  function handleInputLinkField(e) {
    const link = e.target.value
    if(checkLink(link)) {
      setChannelLink(link)
      setErrInLink('')
      disableSubmit(false)
    } else {
      setErrInLink('Please add a valid URL as an invite link for your communication channel')
      disableSubmit(true)
    }
  }

  function handleProjectLink(tag, action) {
    if(tag != null) {
      setRepolink(tag.value)
      checkIssuesAndReadme(tag.value)
    }
  }

 
  async function handleSubmit(e) {
    e.preventDefault();
    
    // check if all the fields are filled are not
    if(
      name == '' ||
      desc == '' ||
      repolink == '' ||
      channelLink == '' ||
      tags.length == 0 ||
      branch == ''
      ) {
        alert('Please fill all the fields of the form')
        return
      }

    disableSubmit(true)

    // Fetch README from the repo of the branch selected
    // remove the last trailing slash, if it exists
    const full_link = repolink
    if (full_link.slice(-1) === "/") {
      full_link = full_link.slice(0,-1)
    }
    
    const splitArr = full_link.split("/")
    const len = splitArr.length
    
    const repoName = splitArr[len-1]
    const ownerName = splitArr[len-2]

    const endpoint = `https://api.github.com/repos/${ownerName}/${repoName}/readme?ref=${branch}`
    const headers = {
      "Accept": "application/vnd.github.v3+json", 
      // recommended by Github
    }

    const res = await axios.get(endpoint, { headers: headers })
    const decodedReadme = atob(res.data['content'])
    setReadme(decodedReadme)
    
    const URL = `${BACKEND_URL}/project/add`;
    const data = {
      'username': localStorage.getItem('mentor_username'),
      // 'username': 'rakaar',
      'name': name,
      'desc': desc,
      'repoLink': repolink,
      'comChannel': channelLink,
      'tags': JSON.stringify(tags),
      'readme': decodedReadme
    }

    // make an axios request to BACKEND here
    fetch(URL,
      {
      method: 'POST',
      headers: {
        Bearer: localStorage.getItem('mentor_jwt')
      },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
      if(res.status === 200)
        alert("Project Submitted Successfully")
      // if the below fails, try using window.location.pathname = "/dashboard/mentor"
      props.history.push("/dashboard/mentor")
    })
    .catch(err => {
      alert('Server Error Try again')
      disableSubmit(false)
    })

  }


  return (
    <React.Fragment>
      <Navbar />
    <div className='box'>

    {/* FOR NOW THIS LINK FIELD IS IN THE TOP BECAUSE, WHEN IT IS KEPT AT THIRD PLACE(WHERE IT SHOULD BE), DUE TO
      SOME CSS ISSUES THE OPTIONS ARE NOT VISIBLE, SINCE I DON'T KNOW TO FIX THAT, I AM LEAVING IT
      
      LATER IN PRODUCTION, KEEP THE LINK FIELD AT THE THIRD PLACE AND FIX THE CSS ISSUE.
      - rakaar
    */}
    <div className='field'>
        <label className='label'>Github Link to the Project</label>
        <div className='control'>
           <CreatableSelect
              isClearable
              onChange={handleProjectLink}
              options={mentorRepos}
              placeholder='Search your Repos or Paste the link'
            />
         </div>
        {errInRepo}
      </div>
      
      <div className='field'>
        <label className='label'>Project Name</label>
        <div className='control'>
          <input
            className='input is-rounded'
            type='text'
            placeholder='Cool name of your project'
            onChange={e => setName(e.target.value)}
          />
        </div>
      </div>

      <div className='field'>
        <label className='label'>Project Description</label>
        <div className='control has-icons-left has-icons-right'>
          <textarea
          className="textarea"
          placeholder="Briefly about your Project"
          onChange={e => setDesc(e.target.value)}
          />
        </div>
      </div>

      {showTags && <div className='field'>
        <label className='label'>Tags for the project</label>
        <div className='control'>
           <CreatableSelect
              isMulti
              isClearable
              onChange={handleChangeTagsField}
              options={options}
              defaultValue={autoTags}
              placeholder='Select or Create Tags'
            />
        </div>
      </div>}

      {showBranches &&
       <div className='field'>
         <label className='label'>Select Branch for stats</label>
         <Select
         isClearable
         isSearchable
         onChange={handleChangeBranchField}
         options={branchOpts}
         defaultValue={branchOpts[0]}
         placeholder='Select Branch'
          />
       </div>}
      
      {showButtonAndOthers && 
      <React.Fragment>
        <div className='field'>
        <label className='label'>Communication channel</label>
        <div className='control'>
          <input
            className='input is-rounded'
            type='text'
            placeholder='Slack invite link for example'
            onInput={handleInputLinkField}
          />
        </div>
        {errInLink}
      </div>

      <div>
        <a
        className='button is-rounded is-fullWidth column is-full'
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        >
        Submit
        </a>
      </div>
      </React.Fragment>}
    </div>
    </React.Fragment>
  );
}
